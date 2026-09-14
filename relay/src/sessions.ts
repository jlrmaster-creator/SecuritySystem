import { WebSocket } from 'ws';
import { EphemeralSession } from './types';
import * as crypto from 'crypto';

// In-memory store
// Maps sessionId -> Session
const sessions = new Map<string, EphemeralSession>();
// Maps userHash -> Set<sessionId> (allows multiple devices per user)
const userSessions = new Map<string, Set<string>>();

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function createSession(ws: WebSocket, userHash: string, publicKey: string, sigPublicKey: string): EphemeralSession {
  const sessionId = crypto.randomUUID();
  const session: EphemeralSession = {
    sessionId,
    userHash,
    publicKey,
    sigPublicKey,
    wsConnection: ws,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS
  };
  
  sessions.set(sessionId, session);
  
  if (!userSessions.has(userHash)) {
    userSessions.set(userHash, new Set());
  }
  userSessions.get(userHash)!.add(sessionId);
  
  return session;
}

export function getSession(sessionId: string): EphemeralSession | undefined {
  const session = sessions.get(sessionId);
  if (session && session.expiresAt > Date.now()) {
    return session;
  }
  if (session) {
    removeSession(sessionId);
  }
  return undefined;
}

export function getActiveConnectionsForUser(userHash: string): WebSocket[] {
  const userSessIds = userSessions.get(userHash);
  if (!userSessIds) return [];
  
  const connections: WebSocket[] = [];
  for (const sid of userSessIds) {
    const s = sessions.get(sid);
    if (s && s.wsConnection.readyState === WebSocket.OPEN) {
      connections.push(s.wsConnection);
    } else {
      // Cleanup dead session
      removeSession(sid);
    }
  }
  return connections;
}

export function removeSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (session) {
    sessions.delete(sessionId);
    const userSess = userSessions.get(session.userHash);
    if (userSess) {
      userSess.delete(sessionId);
      if (userSess.size === 0) {
        userSessions.delete(session.userHash);
      }
    }
  }
}

export function removeSessionByConnection(ws: WebSocket) {
  for (const [sid, session] of sessions.entries()) {
    if (session.wsConnection === ws) {
      removeSession(sid);
      break;
    }
  }
}

export function sweepSessions(now: number): number {
  let count = 0;
  for (const [sid, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      // Close WS if still open
      if (session.wsConnection.readyState === WebSocket.OPEN) {
        session.wsConnection.close(1000, 'Session expired');
      }
      removeSession(sid);
      count++;
    }
  }
  return count;
}
