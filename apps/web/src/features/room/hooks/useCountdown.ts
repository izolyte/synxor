import { useEffect, useState } from "react";
import { useInterval } from "~/shared/hooks/useInterval";
import { formatDuration } from "~/shared/utils/duration";
import { SECOND } from "~/shared/constants/time";
import type { Countdown } from "~/features/room/types/countdown";
import { phaseFor } from "~/features/room/utils/countdown";

/**
 * Live countdown to an ISO 8601 instant. Recomputes every second against the wall
 * clock (so a backgrounded tab catches up on return) and stops ticking once
 * expired. Returns null when no expiry is known (e.g. a Receiver session), so the
 * caller simply omits the countdown. Formatting and urgency are delegated — this
 * hook only owns the ticking and the wiring.
 */
export function useCountdown(expiresAt: string | undefined): Countdown | null {
  const parsed = expiresAt ? new Date(expiresAt).getTime() : null;
  // Guard a tampered/corrupt stored value: an unparseable date → no countdown.
  const target = parsed !== null && Number.isNaN(parsed) ? null : parsed;
  const [remainingMs, setRemainingMs] = useState<number | null>(() =>
    target === null ? null : target - Date.now(),
  );

  // Resync on mount and whenever the target changes.
  useEffect(() => {
    setRemainingMs(target === null ? null : target - Date.now());
  }, [target]);

  // Tick once a second while time remains; pause when there's no target or it's up.
  const live = target !== null && remainingMs !== null && remainingMs > 0;
  useInterval(() => {
    if (target !== null) setRemainingMs(target - Date.now());
  }, live ? SECOND : null);

  if (remainingMs === null) return null;
  return { label: formatDuration(remainingMs), phase: phaseFor(remainingMs) };
}
