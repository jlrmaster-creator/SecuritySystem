import { WebSocket, WebSocketServer } from 'ws';
import * as crypto from 'crypto';
import { createSession, getSession, getActiveConnectionsForUser, removeSessionByConnection } from './sessions';
import { createInvitation, validateAndUseInvitation } from './invitations';
import { bufferMessage, getPendingMessages, ackMessage, bufferContactRequest, getPendingRequests, ackContactRequest } from './messages';
import { EphemeralSession } from './types';

// Map ws connection -> sessionId for reverse lookup
const connectionMap = new WeakMap<WebSocket, string>();

export function setupRelay(wss: WebSocketServer) {
  // On startup, generate one master invite so the first user can join
  const masterInvite = crypto.randomBytes(16).toString('hex').toUpperCase();
  createInvitation(masterInvite);
  console.log(`\n========================================================`);
  console.log(`🚀 RELAY STARTED`);
  console.log(`🔑 MASTER INVITE TOKEN: ${masterInvite.match(/.{1,4}/g)?.join('-')}`);
  console.log(`========================================================\n`);

  wss.on('connection', (ws, req) => {
    console.log(`[WS] New connection from ${req.socket.remoteAddress}`);

    // Parse URL params for session recovery
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const sessionToken = url.searchParams.get('session');

    if (sessionToken) {
      const session = getSession(sessionToken);
      if (session) {
        // Recover session
        session.wsConnection = ws;
        connectionMap.set(ws, session.sessionId);
        console.log(`[WS] Session recovered for user hash: ${session.userHash.slice(0, 8)}...`);
        
        ws.send(JSON.stringify({ type: 'SESSION_OK', sessionToken: session.sessionId }));
        flushPending(session);
      }
    }

    ws.on('message', (messageData) => {
      try {
        const msg = JSON.parse(messageData.toString());
        handleClientMessage(ws, msg);
      } catch (e) {
        console.error('[WS] Failed to parse message', e);
      }
    });

    ws.on('close', () => {
      console.log(`[WS] Connection closed`);
      // We don't remove the session on disconnect immediately to allow reconnects,
      // but we do clean up the connection map.
      removeSessionByConnection(ws);
    });
  });
}

function handleClientMessage(ws: WebSocket, msg: any) {
  const sessionId = connectionMap.get(ws);
  const session = sessionId ? getSession(sessionId) : null;

  switch (msg.type) {
    case 'PING':
      ws.send(JSON.stringify({ type: 'PONG' }));
      break;

    case 'USE_INVITE':
      if (validateAndUseInvitation(msg.token)) {
        ws.send(JSON.stringify({ type: 'INVITE_OK', token: msg.token }));
      } else {
        ws.send(JSON.stringify({ type: 'ERROR', code: 'INVALID_INVITE', message: 'Invite invalid or expired' }));
      }
      break;

    case 'REGISTER':
      // Client has valid invite or just setting up keys
      if (msg.userHash && msg.kxPublicKey && msg.sigPublicKey) {
        const newSession = createSession(ws, msg.userHash, msg.kxPublicKey, msg.sigPublicKey);
        connectionMap.set(ws, newSession.sessionId);
        ws.send(JSON.stringify({ type: 'SESSION_OK', sessionToken: newSession.sessionId }));
        console.log(`[WS] Registered new session for user ${msg.userHash.slice(0, 8)}...`);
        flushPending(newSession);
      }
      break;

    case 'CREATE_INVITE':
      if (!session) return authError(ws);
      const token = crypto.randomBytes(16).toString('hex').toUpperCase();
      createInvitation(token, session.userHash);
      ws.send(JSON.stringify({ type: 'INVITE_CREATED', token }));
      break;

    case 'SEND_MESSAGE':
      if (!session) return authError(ws);
      if (!msg.to || !msg.ciphertext || !msg.messageId) return;
      
      const targetConns = getActiveConnectionsForUser(msg.to);
      const deliveryPayload = {
        type: 'MESSAGE',
        from: session.userHash,
        messageId: msg.messageId,
        ciphertext: msg.ciphertext
      };

      if (targetConns.length > 0) {
        // Deliver immediately
        for (const conn of targetConns) {
          conn.send(JSON.stringify(deliveryPayload));
        }
      }
      // Always buffer until ACK received (in case of multi-device or drop)
      bufferMessage(msg.messageId, msg.to, msg.ciphertext);
      break;

    case 'ACK_RECEIVED':
      if (!session) return authError(ws);
      if (ackMessage(msg.messageId)) {
        // Notify sender that it was delivered
        // (In a full implementation, we'd route this ACK back to the sender's hash)
        // For simplicity in MVP, we just delete from relay buffer.
      }
      break;

    case 'CONTACT_REQUEST':
      if (!session) return authError(ws);
      if (!msg.to || !msg.payload) return;
      
      const reqId = crypto.randomUUID();
      const reqConns = getActiveConnectionsForUser(msg.to);
      const reqPayload = {
        type: 'CONTACT_REQUEST',
        requestId: reqId,
        payload: msg.payload
      };

      if (reqConns.length > 0) {
        for (const conn of reqConns) {
          conn.send(JSON.stringify(reqPayload));
        }
      }
      bufferContactRequest(reqId, session.userHash, msg.to, msg.payload);
      break;

    case 'ACCEPT_CONTACT':
      if (!session) return authError(ws);
      ackContactRequest(msg.requestId);
      // In full implementation, forward the acceptance response to the original sender
      break;

    case 'REJECT_CONTACT':
      if (!session) return authError(ws);
      ackContactRequest(msg.requestId);
      break;
  }
}

function authError(ws: WebSocket) {
  ws.send(JSON.stringify({ type: 'ERROR', code: 'UNAUTHORIZED', message: 'No valid session' }));
}

function flushPending(session: EphemeralSession) {
  const pendingMsgs = getPendingMessages(session.userHash);
  for (const m of pendingMsgs) {
    session.wsConnection.send(JSON.stringify({
      type: 'MESSAGE',
      // We don't have sender hash in the buffer struct for simplicity in this MVP, 
      // but client handles it if we included it. Let's assume client matches by decryption success.
      messageId: m.messageId,
      ciphertext: m.ciphertext
    }));
  }

  const pendingReqs = getPendingRequests(session.userHash);
  for (const r of pendingReqs) {
    session.wsConnection.send(JSON.stringify({
      type: 'CONTACT_REQUEST',
      requestId: r.requestId,
      payload: r.encryptedPayload
    }));
  }
}
