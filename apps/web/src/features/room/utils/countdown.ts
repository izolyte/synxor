import { EXPIRING_SOON_MS } from "~/features/room/constants/countdown";
import type { CountdownPhase } from "~/features/room/types/countdown";

/** Room expiry urgency from the milliseconds remaining. */
export function phaseFor(remainingMs: number): CountdownPhase {
  if (remainingMs <= 0) return "expired";
  if (remainingMs <= EXPIRING_SOON_MS) return "expiring";
  return "live";
}
