/**
 * websocket.js — SecureChat WebSocket Relay Client
 *
 * Manages the persistent WebSocket connection to the relay server.
 * All payloads sent to the relay are either:
 *   - Encrypted E2EE ciphertext (messages)
 *   - Metadata-minimal control frames (session, ACKs)
 *
 * The relay NEVER sees plaintext message content.
 */

'use strict';

const WSModule = (() => {
  let _ws = null;
  let _connected = false;
  let _reconnectTimer = null;
  let _reconnectAttempts = 0;
  let _pingInterval = null;

  // Event handlers registered by app
  const _handlers = {};

  // Message queue for offline sending (drained on reconnect)
  const _pendingQueue = [];

  // Relay URL — defaults to localhost for development
  // In production, replace with your actual relay domain over WSS
  const RELAY_URL = (() => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'ws://localhost:3000';
    }
    // Production: use same host over WSS
    return `wss://${host}:3000`;
  })();

  const PING_INTERVAL_MS  = 25000;  // 25s keepalive
  const RECONNECT_BASE_MS = 1000;   // 1s initial reconnect delay
  const RECONNECT_MAX_MS  = 30000;  // 30s max delay
  const MAX_QUEUE_SIZE    = 50;

  // ── Connection ───────────────────────────────────────────

  function connect() {
    if (_ws && (_ws.readyState === WebSocket.OPEN || _ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const sessionToken = StorageModule.getSessionToken();
    const url = sessionToken
      ? `${RELAY_URL}?session=${encodeURIComponent(sessionToken)}`
      : RELAY_URL;

    console.log(`[WS] Connecting to relay: ${RELAY_URL}`);
    _emit('connectionChange', { status: 'connecting' });

    try {
      _ws = new WebSocket(url);
    } catch (e) {
      console.warn('[WS] WebSocket creation failed:', e.message);
      _scheduleReconnect();
      return;
    }

    _ws.onopen = _onOpen;
    _ws.onmessage = _onMessage;
    _ws.onerror = _onError;
    _ws.onclose = _onClose;
  }

  function disconnect() {
    _clearTimers();
    if (_ws) {
      _ws.onclose = null; // Prevent reconnect on intentional disconnect
      _ws.close(1000, 'User disconnected');
      _ws = null;
    }
    _connected = false;
    _emit('connectionChange', { status: 'offline' });
  }

  function isConnected() {
    return _connected;
  }

  // ── WebSocket event handlers ─────────────────────────────

  function _onOpen() {
    console.log('[WS] Connected to relay.');
    _connected = true;
    _reconnectAttempts = 0;
    _emit('connectionChange', { status: 'online' });

    // Start ping keepalive
    _pingInterval = setInterval(_sendPing, PING_INTERVAL_MS);

    // Register session with relay if we have a session token
    const sessionToken = StorageModule.getSessionToken();
    if (sessionToken && IdentityModule.isUnlocked()) {
      _sendRaw({
        type: 'REGISTER',
        sessionToken,
        userHash: IdentityModule.getUserHash(),
        kxPublicKey: IdentityModule.getPublicKey(),
        sigPublicKey: IdentityModule.getSigningPublicKey(),
      });
    }

    // Drain pending queue
    while (_pendingQueue.length > 0) {
      const msg = _pendingQueue.shift();
      _sendRaw(msg);
    }
  }

  function _onMessage(event) {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      console.warn('[WS] Received non-JSON message.');
      return;
    }

    // Route to appropriate handler
    switch (data.type) {
      case 'SESSION_OK':
        StorageModule.saveSessionToken(data.sessionToken);
        _emit('sessionOk', data);
        break;

      case 'INVITE_OK':
        _emit('inviteOk', data);
        break;

      case 'INVITE_CREATED':
        _emit('inviteCreated', data);
        break;

      case 'MESSAGE':
        _handleIncomingMessage(data);
        break;

      case 'CONTACT_REQUEST':
        _handleContactRequest(data);
        break;

      case 'CONTACT_ACCEPTED':
        _emit('contactAccepted', data);
        break;

      case 'CONTACT_REJECTED':
        _emit('contactRejected', data);
        break;

      case 'DELIVERY_ACK':
        _emit('deliveryAck', data);
        break;

      case 'ERROR':
        console.warn('[WS] Relay error:', data.code, data.message);
        _emit('relayError', data);
        break;

      case 'PONG':
        // Keepalive response — no action needed
        break;

      default:
        console.log('[WS] Unknown message type:', data.type);
    }
  }

  function _onError(event) {
    console.warn('[WS] WebSocket error:', event);
  }

  function _onClose(event) {
    _connected = false;
    _clearTimers();
    console.log(`[WS] Connection closed. Code: ${event.code}`);
    _emit('connectionChange', { status: 'offline' });

    // Don't reconnect if it was a clean close
    if (event.code !== 1000) {
      _scheduleReconnect();
    }
  }

  // ── Reconnection ─────────────────────────────────────────

  function _scheduleReconnect() {
    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, _reconnectAttempts),
      RECONNECT_MAX_MS
    );
    _reconnectAttempts++;
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${_reconnectAttempts})`);
    _reconnectTimer = setTimeout(connect, delay);
  }

  function _clearTimers() {
    if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
    if (_pingInterval)   { clearInterval(_pingInterval);  _pingInterval = null; }
  }

  // ── Sending ───────────────────────────────────────────────

  function _sendRaw(data) {
    if (_ws && _ws.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify(data));
      return true;
    }
    // Queue for when we reconnect (only for important messages)
    if (_pendingQueue.length < MAX_QUEUE_SIZE) {
      _pendingQueue.push(data);
    }
    return false;
  }

  function _sendPing() {
    _sendRaw({ type: 'PING' });
  }

  /**
   * Send an E2EE encrypted message to a peer.
   *
   * @param {string} toUserHash - Recipient's lookup hash
   * @param {string} ciphertext - E2EE encrypted blob (base64 JSON)
   * @param {string} messageId  - Local message ID
   */
  function sendMessage(toUserHash, ciphertext, messageId) {
    return _sendRaw({
      type: 'SEND_MESSAGE',
      to: toUserHash,
      ciphertext,
      messageId,
    });
  }

  /**
   * Send a contact request to another user.
   *
   * @param {string} toUserHash - Target user's lookup hash
   * @param {Object} signedPayload - From IdentityModule.buildContactRequestPayload()
   */
  function sendContactRequest(toUserHash, signedPayload) {
    return _sendRaw({
      type: 'CONTACT_REQUEST',
      to: toUserHash,
      payload: JSON.stringify(signedPayload),
    });
  }

  /**
   * Accept a contact request.
   */
  function acceptContactRequest(requestId, responsePayload) {
    return _sendRaw({
      type: 'ACCEPT_CONTACT',
      requestId,
      response: JSON.stringify(responsePayload),
    });
  }

  /**
   * Reject a contact request.
   */
  function rejectContactRequest(requestId) {
    return _sendRaw({
      type: 'REJECT_CONTACT',
      requestId,
    });
  }

  /**
   * Acknowledge message delivery. Relay deletes the message after ACK.
   */
  function ackMessage(messageId) {
    return _sendRaw({
      type: 'ACK_RECEIVED',
      messageId,
    });
  }

  /**
   * Request a new invitation token (for creating invites to share).
   */
  function requestInvite() {
    return _sendRaw({ type: 'CREATE_INVITE' });
  }

  /**
   * Validate and use an invitation token during registration.
   */
  function useInvite(token) {
    return _sendRaw({ type: 'USE_INVITE', token: token.trim().toUpperCase() });
  }

  // ── Incoming handlers ────────────────────────────────────

  function _handleIncomingMessage(data) {
    // data = { type, from, messageId, ciphertext }
    // Try to find the conversation for this sender
    const convs = StorageModule.getConversations();
    const conv = Object.values(convs).find(c => c.userHash === data.from);

    if (!conv) {
      console.warn('[WS] Message from unknown peer, ignoring.');
      return;
    }

    // Decrypt message using conversation's rx key
    let plaintext;
    try {
      plaintext = CryptoModule.decryptMessage(data.ciphertext, conv.sharedKeyRx);
    } catch (e) {
      console.error('[WS] Failed to decrypt message:', e.message);
      return;
    }

    // Save decrypted message locally
    const msg = {
      id: data.messageId,
      content: plaintext,
      preview: plaintext.slice(0, 40),
      direction: 'in',
      timestamp: Date.now(),
      status: 'delivered',
      expiresAt: conv.ttlMs ? Date.now() + conv.ttlMs : null,
    };
    StorageModule.saveMessage(conv.id, msg);

    // ACK to relay — causes relay to delete its copy
    ackMessage(data.messageId);

    // Notify UI
    _emit('messageReceived', { conversationId: conv.id, message: msg });
  }

  function _handleContactRequest(data) {
    // data = { type, requestId, payload }
    let parsed;
    try {
      parsed = JSON.parse(data.payload);
    } catch {
      console.warn('[WS] Invalid contact request payload.');
      return;
    }

    // Verify signature
    const payloadStr = JSON.stringify(parsed.payload);
    const valid = CryptoModule.verify(
      payloadStr,
      parsed.signature,
      parsed.payload.sigPublicKey
    );

    if (!valid) {
      console.warn('[WS] Contact request signature verification FAILED. Ignoring.');
      return;
    }

    // Save pending request
    const req = {
      id: data.requestId,
      fromUserId: parsed.payload.fromUserId,
      fromUserHash: parsed.payload.fromUserHash,
      fromAlias: parsed.payload.fromAlias,
      kxPublicKey: parsed.payload.kxPublicKey,
      sigPublicKey: parsed.payload.sigPublicKey,
      timestamp: parsed.payload.timestamp,
      receivedAt: Date.now(),
    };

    StorageModule.savePendingRequest(req);
    _emit('contactRequest', req);
  }

  // ── Event system ─────────────────────────────────────────

  function on(event, handler) {
    if (!_handlers[event]) _handlers[event] = [];
    _handlers[event].push(handler);
  }

  function off(event, handler) {
    if (!_handlers[event]) return;
    _handlers[event] = _handlers[event].filter(h => h !== handler);
  }

  function _emit(event, data) {
    if (_handlers[event]) {
      for (const h of _handlers[event]) {
        try { h(data); } catch (e) { console.error('[WS] Handler error:', e); }
      }
    }
  }

  // ── Public API ────────────────────────────────────────────
  return {
    connect,
    disconnect,
    isConnected,
    sendMessage,
    sendContactRequest,
    acceptContactRequest,
    rejectContactRequest,
    ackMessage,
    requestInvite,
    useInvite,
    on,
    off,
  };
})();
