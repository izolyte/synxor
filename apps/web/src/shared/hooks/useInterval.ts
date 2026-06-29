import { useEffect, useRef } from "react";

/**
 * Declarative setInterval (Dan Abramov's pattern): the latest callback fires each
 * tick without restarting the timer, and a `null` delay pauses it. Keeping the
 * timing here lets callers express *what* to do on a tick, not *how* to schedule it.
 */
export function useInterval(callback: () => void, delayMs: number | null): void {
  const saved = useRef(callback);

  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delayMs === null) return;
    const id = setInterval(() => saved.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}
