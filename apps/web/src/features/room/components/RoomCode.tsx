import { useEffect, useRef, useState } from "react";

/**
 * The Room Code as the focal element of the share view: large, monospace, and
 * selectable so it can be read aloud or copied by hand. The aria-label spells the
 * code out (space-separated) so screen readers announce each character instead of
 * trying to pronounce it as a word; the visible/selectable text stays unspaced.
 *
 * The badge pulses once when a Receiver joins (receiverCount rises) — the Room made
 * visible at the one moment it changes. A drop or the first render never fires it.
 * Under prefers-reduced-motion the duration token collapses to 0ms (see globals).
 */
export function RoomCode({ code, receiverCount = 0 }: { code: string; receiverCount?: number }) {
  const [pulsing, setPulsing] = useState(false);
  const prevCount = useRef(receiverCount);

  useEffect(() => {
    if (receiverCount > prevCount.current) setPulsing(true);
    prevCount.current = receiverCount;
  }, [receiverCount]);

  return (
    <p
      aria-label={`Room Code: ${code.split("").join(" ")}`}
      onAnimationEnd={() => setPulsing(false)}
      className={`text-foreground select-all text-center font-mono text-5xl font-bold tracking-[var(--tracking-wide)]${
        pulsing ? " [animation:badge-pulse_var(--duration-normal)_var(--ease-out)]" : ""
      }`}
    >
      {code}
    </p>
  );
}
