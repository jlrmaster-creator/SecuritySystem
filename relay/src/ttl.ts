import {
  sweepSessions
} from './sessions';
import { sweepInvitations } from './invitations';
import { sweepMessages } from './messages';

const SWEEP_INTERVAL_MS = 60 * 1000; // 1 minute

export function startTTLSweeper() {
  console.log(`[TTL] Starting automatic TTL sweeper (interval: ${SWEEP_INTERVAL_MS}ms)`);
  setInterval(() => {
    const now = Date.now();
    
    const sessCount = sweepSessions(now);
    const invCount = sweepInvitations(now);
    const msgCount = sweepMessages(now);
    
    const total = sessCount + invCount + msgCount;
    if (total > 0) {
      console.log(`[TTL] Swept ${total} expired items (${sessCount} sessions, ${invCount} invites, ${msgCount} msgs/reqs)`);
    }
  }, SWEEP_INTERVAL_MS);
}
