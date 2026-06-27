import { DAY_MS, HOUR_MS } from '../../common/time';
import { InvalidExpiryError } from './room.errors';

// Single source of truth for Room Expiry options. The tRPC input schema and the
// service both derive from here, so the allowed values can't drift apart.
const EXPIRY_DURATIONS_MS = {
  '1h': HOUR_MS,
  '24h': 24 * HOUR_MS,
  '7d': 7 * DAY_MS,
} as const;

export type Expiry = keyof typeof EXPIRY_DURATIONS_MS;

export const EXPIRY_VALUES = Object.keys(EXPIRY_DURATIONS_MS) as [Expiry, ...Expiry[]];

/**
 * Computes the expiration date for a room.
 *
 * @param expiry - The allowed expiry option to resolve.
 * @param now - The current timestamp in milliseconds.
 * @returns The expiration date.
 */
export function resolveExpiresAt(expiry: Expiry, now: number = Date.now()): Date {
  const duration = EXPIRY_DURATIONS_MS[expiry];
  // Guard the invariant at the domain edge: a bad cast or an unvalidated caller
  // would otherwise yield `now + undefined` → a silent Invalid Date.
  if (duration === undefined) {
    throw new InvalidExpiryError(String(expiry));
  }
  return new Date(now + duration);
}
