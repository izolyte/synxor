import { useEffect, useRef, useState } from "react";
import type { CountdownPhase } from "~/features/room/types/countdown";

/**
 * A single self-clearing signal the first time a Room enters its approaching-Expiry
 * window — whether the countdown ticks across the threshold live or the Room is
 * opened already inside it. Latched, so it never nags: it doesn't re-fire on the
 * following ticks (the phase holds steady, so the effect doesn't even re-run) and it
 * stays quiet on the "expired" sealing phase. `displayMs` is how long it shows before
 * clearing itself; it's a test seam.
 */
export function useExpiryWarning(phase: CountdownPhase | undefined, displayMs = 6000): boolean {
  const [visible, setVisible] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current || phase !== "expiring") return;
    firedRef.current = true;
    setVisible(true);
  }, [phase]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), displayMs);
    return () => clearTimeout(timer);
  }, [visible, displayMs]);

  return visible;
}
