import { EphemeralInvitation } from './types';

// In-memory store
const invitations = new Map<string, EphemeralInvitation>();

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createInvitation(token: string, creatorHash: string | null = null): EphemeralInvitation {
  const invite: EphemeralInvitation = {
    token,
    creatorHash,
    createdAt: Date.now(),
    expiresAt: Date.now() + INVITE_TTL_MS,
    usedAt: null,
    revoked: false
  };
  invitations.set(token, invite);
  return invite;
}

export function validateAndUseInvitation(token: string): boolean {
  const invite = invitations.get(token);
  
  if (!invite) return false;
  if (invite.revoked) return false;
  if (invite.usedAt !== null) return false;
  if (invite.expiresAt < Date.now()) {
    invitations.delete(token); // Cleanup on failed access
    return false;
  }
  
  // Mark as used (one-time use)
  invite.usedAt = Date.now();
  // We can immediately delete it to save memory, or keep it around for audit logs (if we had them)
  // For maximum privacy, delete immediately after successful use.
  invitations.delete(token);
  
  return true;
}

export function sweepInvitations(now: number): number {
  let count = 0;
  for (const [token, invite] of invitations.entries()) {
    if (invite.expiresAt < now) {
      invitations.delete(token);
      count++;
    }
  }
  return count;
}
