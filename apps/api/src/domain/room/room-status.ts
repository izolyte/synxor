import type { Room } from './room.entity';

/**
 * Whether a Room can no longer be joined.
 *
 * Status is the authoritative lifecycle signal, so anything other
 * than `ACTIVE` (`CLOSED` or `EXPIRED`) is closed to new Participants. An
 * `ACTIVE` Room is also treated as expired once its Expiry has passed: the
 * sweeper that flips `ACTIVE → EXPIRED` runs lazily, so a Room can sit past
 * `expiresAt` while still ACTIVE, and a Receiver must not slip into that gap.
 *
 * @param room - The Room to evaluate.
 * @param now - The current time; defaults to the wall clock.
 * @returns `true` when the Room is expired or otherwise not joinable.
 */
export function isExpired(room: Room, now: Date = new Date()): boolean {
  return room.status !== 'ACTIVE' || room.expiresAt.getTime() <= now.getTime();
}
