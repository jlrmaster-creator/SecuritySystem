import { WebSocket } from 'ws';

export interface EphemeralSession {
  sessionId: string;
  userHash: string;
  publicKey: string;
  sigPublicKey: string;
  wsConnection: WebSocket;
  createdAt: number;
  expiresAt: number;
}

export interface EphemeralInvitation {
  token: string;
  creatorHash: string | null; // null for system-created invites (like first one)
  createdAt: number;
  expiresAt: number;
  usedAt: number | null;
  revoked: boolean;
}

export interface EncryptedMessage {
  messageId: string;
  recipientHash: string;
  ciphertext: string;
  createdAt: number;
  expiresAt: number;
  delivered: boolean;
}

export interface ContactRequest {
  requestId: string;
  fromHash: string;
  toHash: string;
  encryptedPayload: string; // The signed payload stringified
  createdAt: number;
  expiresAt: number;
}
