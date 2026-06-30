import { createHash } from 'crypto';

// Storage hash for a Room Token. The Participant.tokenHash unique constraint is
// keyed on this, so every site that records a Participant must hash identically.
export function hashRoomToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
