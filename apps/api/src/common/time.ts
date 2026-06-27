export const SECOND_MS = 1_000;
export const MINUTE_MS = 60 * SECOND_MS;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/**
 * Computes the whole number of seconds between a reference time and an instant.
 *
 * @param instant - The date to measure against.
 * @param now - The reference timestamp in milliseconds since the Unix epoch.
 * @returns The floored number of seconds between `now` and `instant`.
 */
export function secondsUntil(instant: Date, now: number = Date.now()): number {
  return Math.floor((instant.getTime() - now) / SECOND_MS);
}
