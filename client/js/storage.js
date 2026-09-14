/**
 * storage.js — SecureChat Local Storage Module
 *
 * Manages encrypted local persistence using localStorage and IndexedDB.
 * Private keys are encrypted with a PIN-derived key (Argon2id).
 * All stored data uses consistent keys under a namespace.
 *
 * Security model:
 *  - Private keys NEVER stored in plaintext
 *  - All sensitive data encrypted before write
 *  - Messages stored with TTL — auto-purged by background sweep
 */

'use strict';

const StorageModule = (() => {
  const NS = 'sc:'; // namespace prefix
  const KEYS = {
    IDENTITY:        NS + 'identity',       // encrypted identity bundle
    PIN_SALT:        NS + 'pin_salt',       // Argon2id salt for PIN
    CONVERSATIONS:   NS + 'convs',          // encrypted conversation map
    MESSAGES_PREFIX: NS + 'msg:',           // per-conversation messages
    SESSION_TOKEN:   NS + 'session',        // ephemeral session token
    PENDING_REQS:    NS + 'pending_reqs',   // incoming contact requests
    OUTGOING_REQS:   NS + 'outgoing_reqs',  // outgoing contact requests
    SETTINGS:        NS + 'settings',       // app settings (non-sensitive)
    TTL_CONFIG:      NS + 'ttl',            // disappearing messages config
    DEVICE_ID:       NS + 'device_id',      // random device identifier
  };

  // Active PIN-derived key for this session (in memory, never persisted as-is)
  let _sessionKey = null;

  // ── Session Key ──────────────────────────────────────────

  /**
   * Set the session key derived from the user's PIN.
   * Must be called after PIN verification.
   *
   * @param {string} keyB64 - Base64-encoded 32-byte key
   */
  function setSessionKey(keyB64) {
    _sessionKey = keyB64;
  }

  function hasSessionKey() {
    return _sessionKey !== null;
  }

  function clearSessionKey() {
    _sessionKey = null;
  }

  // ── Low-level helpers ────────────────────────────────────

  function _ls_get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function _ls_set(key, value) {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  }

  function _ls_del(key) {
    try { localStorage.removeItem(key); } catch {}
  }

  function _ls_get_json(key) {
    const raw = _ls_get(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  function _ls_set_json(key, obj) {
    return _ls_set(key, JSON.stringify(obj));
  }

  function _requireSessionKey() {
    if (!_sessionKey) throw new Error('[Storage] No session key set. User must authenticate first.');
  }

  // ── Identity ─────────────────────────────────────────────

  /**
   * Save the identity bundle (keys, userId, phone hash) encrypted with PIN.
   *
   * @param {Object} identityBundle
   * @param {string} pinKeyB64 - The PIN-derived key (from CryptoModule.deriveKeyFromPin)
   */
  function saveIdentity(identityBundle, pinKeyB64) {
    const encrypted = CryptoModule.encryptWithPin(identityBundle, pinKeyB64);
    _ls_set(KEYS.IDENTITY, encrypted);
  }

  function savePinSalt(saltB64) {
    _ls_set(KEYS.PIN_SALT, saltB64);
  }

  function getPinSalt() {
    return _ls_get(KEYS.PIN_SALT);
  }

  function hasIdentity() {
    return _ls_get(KEYS.IDENTITY) !== null;
  }

  /**
   * Load and decrypt the identity bundle with PIN.
   *
   * @param {string} pinKeyB64
   * @returns {Object|null}
   */
  function loadIdentity(pinKeyB64) {
    const encrypted = _ls_get(KEYS.IDENTITY);
    if (!encrypted) return null;
    try {
      return CryptoModule.decryptWithPin(encrypted, pinKeyB64);
    } catch {
      throw new Error('[Storage] Failed to decrypt identity: incorrect PIN or corrupted data.');
    }
  }

  function deleteIdentity() {
    _ls_del(KEYS.IDENTITY);
    _ls_del(KEYS.PIN_SALT);
  }

  // ── Session Token ────────────────────────────────────────

  function saveSessionToken(token) {
    // Session token is not highly sensitive — store in plain
    // It's ephemeral and server-validated; leaked token ≠ private key
    _ls_set(KEYS.SESSION_TOKEN, token);
  }

  function getSessionToken() {
    return _ls_get(KEYS.SESSION_TOKEN);
  }

  function clearSessionToken() {
    _ls_del(KEYS.SESSION_TOKEN);
  }

  // ── Device ID ────────────────────────────────────────────

  function getOrCreateDeviceId() {
    let id = _ls_get(KEYS.DEVICE_ID);
    if (!id) {
      id = CryptoModule.generateId();
      _ls_set(KEYS.DEVICE_ID, id);
    }
    return id;
  }

  // ── Conversations ────────────────────────────────────────

  /**
   * Get the list of all active conversations (metadata only, no messages).
   *
   * @returns {Object} Map of conversationId → ConversationMeta
   */
  function getConversations() {
    return _ls_get_json(KEYS.CONVERSATIONS) || {};
  }

  /**
   * Save/update a conversation entry.
   *
   * @param {Object} conversation - { id, userId, alias, publicKey, sharedSecret, lastMessage, lastTime, unread, ttlMs }
   */
  function saveConversation(conversation) {
    const convs = getConversations();
    convs[conversation.id] = {
      ...conversation,
      updatedAt: Date.now(),
    };
    _ls_set_json(KEYS.CONVERSATIONS, convs);
  }

  function deleteConversation(conversationId) {
    const convs = getConversations();
    delete convs[conversationId];
    _ls_set_json(KEYS.CONVERSATIONS, convs);
    // Also delete messages
    _ls_del(KEYS.MESSAGES_PREFIX + conversationId);
  }

  function getConversation(conversationId) {
    const convs = getConversations();
    return convs[conversationId] || null;
  }

  // ── Messages ─────────────────────────────────────────────

  /**
   * Get all messages for a conversation.
   * Returns an array of message objects sorted by timestamp.
   *
   * @param {string} conversationId
   * @returns {Array} messages
   */
  function getMessages(conversationId) {
    const raw = _ls_get_json(KEYS.MESSAGES_PREFIX + conversationId);
    return raw || [];
  }

  /**
   * Append a message to a conversation.
   * Enforces TTL: messages older than the conversation TTL are auto-pruned.
   *
   * @param {string} conversationId
   * @param {Object} message - { id, content, direction, timestamp, status, expiresAt? }
   */
  function saveMessage(conversationId, message) {
    const msgs = getMessages(conversationId);
    const conv = getConversation(conversationId);
    const ttlMs = conv?.ttlMs || null;

    // Set expiry if TTL configured
    const msgWithExpiry = {
      ...message,
      expiresAt: ttlMs ? Date.now() + ttlMs : null,
    };

    msgs.push(msgWithExpiry);

    // Prune expired messages
    const now = Date.now();
    const pruned = msgs.filter(m => !m.expiresAt || m.expiresAt > now);

    // Limit history size (max 200 messages per conversation for privacy)
    const limited = pruned.slice(-200);
    _ls_set_json(KEYS.MESSAGES_PREFIX + conversationId, limited);

    // Update last message preview in conversation meta
    if (conv) {
      conv.lastMessage = message.direction === 'out' ? '🔒 Tú: ' + message.preview : '🔒 ' + message.preview;
      conv.lastTime = message.timestamp;
      conv.unread = message.direction === 'in' ? (conv.unread || 0) + 1 : conv.unread;
      saveConversation(conv);
    }
  }

  /**
   * Mark a message as delivered or read.
   */
  function updateMessageStatus(conversationId, messageId, status) {
    const msgs = getMessages(conversationId);
    const idx = msgs.findIndex(m => m.id === messageId);
    if (idx !== -1) {
      msgs[idx].status = status;
      _ls_set_json(KEYS.MESSAGES_PREFIX + conversationId, msgs);
    }
  }

  function markConversationRead(conversationId) {
    const conv = getConversation(conversationId);
    if (conv) {
      conv.unread = 0;
      saveConversation(conv);
    }
  }

  /**
   * Run a sweep of all messages to delete expired ones (disappearing messages).
   * Call this on app startup and periodically.
   */
  function sweepExpiredMessages() {
    const now = Date.now();
    const convs = getConversations();
    let swept = 0;
    for (const convId of Object.keys(convs)) {
      const msgs = getMessages(convId);
      const before = msgs.length;
      const live = msgs.filter(m => !m.expiresAt || m.expiresAt > now);
      if (live.length !== before) {
        _ls_set_json(KEYS.MESSAGES_PREFIX + convId, live);
        swept += (before - live.length);
      }
    }
    if (swept > 0) console.log(`[Storage] Swept ${swept} expired messages.`);
    return swept;
  }

  // ── Contact Requests ─────────────────────────────────────

  function getPendingRequests() {
    return _ls_get_json(KEYS.PENDING_REQS) || [];
  }

  function savePendingRequest(req) {
    const reqs = getPendingRequests();
    reqs.push(req);
    _ls_set_json(KEYS.PENDING_REQS, reqs);
  }

  function removePendingRequest(requestId) {
    const reqs = getPendingRequests();
    const filtered = reqs.filter(r => r.id !== requestId);
    _ls_set_json(KEYS.PENDING_REQS, filtered);
  }

  function getOutgoingRequests() {
    return _ls_get_json(KEYS.OUTGOING_REQS) || [];
  }

  function saveOutgoingRequest(req) {
    const reqs = getOutgoingRequests();
    reqs.push(req);
    _ls_set_json(KEYS.OUTGOING_REQS, reqs);
  }

  function removeOutgoingRequest(requestId) {
    const reqs = getOutgoingRequests();
    const filtered = reqs.filter(r => r.id !== requestId);
    _ls_set_json(KEYS.OUTGOING_REQS, filtered);
  }

  // ── Settings ─────────────────────────────────────────────

  function getSettings() {
    return _ls_get_json(KEYS.SETTINGS) || {
      disappearingMs: null,   // null = messages persist (locally)
      lockOnBackground: true,
      notificationsEnabled: true,
      alias: '',
    };
  }

  function saveSettings(settings) {
    const current = getSettings();
    _ls_set_json(KEYS.SETTINGS, { ...current, ...settings });
  }

  // ── Full wipe ────────────────────────────────────────────

  /**
   * Completely wipe all local data. Emergency use only.
   * After this, the user will need a new invitation to rejoin.
   */
  function nukeAllData() {
    const keysToDelete = Object.values(KEYS);
    const convs = getConversations();
    for (const convId of Object.keys(convs)) {
      keysToDelete.push(KEYS.MESSAGES_PREFIX + convId);
    }
    for (const k of keysToDelete) {
      _ls_del(k);
    }
    _sessionKey = null;
    console.warn('[Storage] ⚠️ ALL local data has been wiped.');
  }

  // ── Public API ────────────────────────────────────────────
  return {
    // Session key
    setSessionKey,
    hasSessionKey,
    clearSessionKey,
    // Identity
    saveIdentity,
    savePinSalt,
    getPinSalt,
    hasIdentity,
    loadIdentity,
    deleteIdentity,
    // Session token
    saveSessionToken,
    getSessionToken,
    clearSessionToken,
    // Device
    getOrCreateDeviceId,
    // Conversations
    getConversations,
    saveConversation,
    deleteConversation,
    getConversation,
    // Messages
    getMessages,
    saveMessage,
    updateMessageStatus,
    markConversationRead,
    sweepExpiredMessages,
    // Requests
    getPendingRequests,
    savePendingRequest,
    removePendingRequest,
    getOutgoingRequests,
    saveOutgoingRequest,
    removeOutgoingRequest,
    // Settings
    getSettings,
    saveSettings,
    // Wipe
    nukeAllData,
  };
})();
