import { EncryptedMessage, ContactRequest } from './types';

// In-memory buffers
const messageBuffer = new Map<string, EncryptedMessage>();
const requestBuffer = new Map<string, ContactRequest>();

const MSG_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours
const REQ_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

// ── Messages ──────────────────────────────────────────────

export function bufferMessage(messageId: string, recipientHash: string, ciphertext: string): void {
  messageBuffer.set(messageId, {
    messageId,
    recipientHash,
    ciphertext,
    createdAt: Date.now(),
    expiresAt: Date.now() + MSG_TTL_MS,
    delivered: false
  });
}

export function getPendingMessages(recipientHash: string): EncryptedMessage[] {
  const pending: EncryptedMessage[] = [];
  for (const msg of messageBuffer.values()) {
    if (msg.recipientHash === recipientHash && !msg.delivered) {
      pending.push(msg);
    }
  }
  return pending;
}

export function ackMessage(messageId: string): boolean {
  return messageBuffer.delete(messageId);
}

// ── Contact Requests ──────────────────────────────────────

export function bufferContactRequest(requestId: string, fromHash: string, toHash: string, encryptedPayload: string): void {
  requestBuffer.set(requestId, {
    requestId,
    fromHash,
    toHash,
    encryptedPayload,
    createdAt: Date.now(),
    expiresAt: Date.now() + REQ_TTL_MS
  });
}

export function getPendingRequests(toHash: string): ContactRequest[] {
  const pending: ContactRequest[] = [];
  for (const req of requestBuffer.values()) {
    if (req.toHash === toHash) {
      pending.push(req);
    }
  }
  return pending;
}

export function ackContactRequest(requestId: string): boolean {
  return requestBuffer.delete(requestId);
}

// ── Sweeping ──────────────────────────────────────────────

export function sweepMessages(now: number): number {
  let count = 0;
  
  for (const [id, msg] of messageBuffer.entries()) {
    if (msg.expiresAt < now) {
      messageBuffer.delete(id);
      count++;
    }
  }
  
  for (const [id, req] of requestBuffer.entries()) {
    if (req.expiresAt < now) {
      requestBuffer.delete(id);
      count++;
    }
  }
  
  return count;
}
