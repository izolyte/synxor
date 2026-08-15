import { HOUR, MINUTE } from "~/shared/constants/time";

// The countdown turns amber for the final slice of a Room's life. Scaling that slice
// to the total lifespan — rather than a flat 5 minutes — means a 1-hour Room and a
// 7-day Room warn at proportionate points: a fixed 5 minutes is an eternity for the
// former and a blink for the latter.
export const EXPIRY_WARN_FRACTION = 0.1;

// …but clamped to a sane band. The floor keeps a very short Room from warning for
// barely a moment; the ceiling stops a week-long Room sitting amber for most of a
// day. Across the real Expiry options (1h/24h/7d) the fraction lands inside the band,
// so those get a purely proportional warning and the clamp only guards pathological
// lifespans.
export const MIN_EXPIRY_WARN_MS = 5 * MINUTE;
export const MAX_EXPIRY_WARN_MS = 24 * HOUR;
