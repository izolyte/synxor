export const SECOND_MS = 1_000;
export const MINUTE_MS = 60 * SECOND_MS;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

// Whole seconds between now and a future instant; negative once it has passed.
export function secondsUntil(instant: Date, now: number = Date.now()): number {
  return Math.floor((instant.getTime() - now) / SECOND_MS);
}
