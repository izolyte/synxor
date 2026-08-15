import {
  EXPIRY_WARN_FRACTION,
  MAX_EXPIRY_WARN_MS,
  MIN_EXPIRY_WARN_MS,
} from "~/features/room/constants/countdown";
import type { CountdownPhase } from "~/features/room/types/countdown";

/**
 * How close to Expiry the countdown turns amber, scaled to the Room's total lifespan
 * so short and long Rooms warn at proportionate points (see the constants for the
 * fraction and its clamp band). `lifespanMs` is null when the Room's start isn't
 * known — a legacy session stored before createdAt existed — and we fall back to the
 * floor rather than invent a proportion.
 */
export function warnThresholdMs(lifespanMs: number | null): number {
  if (lifespanMs === null || !Number.isFinite(lifespanMs) || lifespanMs <= 0) {
    return MIN_EXPIRY_WARN_MS;
  }
  return Math.min(MAX_EXPIRY_WARN_MS, Math.max(MIN_EXPIRY_WARN_MS, EXPIRY_WARN_FRACTION * lifespanMs));
}

/** Room expiry urgency from the milliseconds remaining and the Room's lifespan. */
export function phaseFor(remainingMs: number, lifespanMs: number | null): CountdownPhase {
  if (remainingMs <= 0) return "expired";
  if (remainingMs <= warnThresholdMs(lifespanMs)) return "expiring";
  return "live";
}
