import { useCallback, useEffect, useRef } from "react";

// Stop signalling after this long without a keystroke — the composer went quiet.
const IDLE_MS = 2500;
// While the user keeps typing, refresh peers no more than this often. Kept under
// useRoomSocket's TYPING_SAFETY_TIMEOUT_MS so a still-composing peer never lapses,
// while sparing the Room a frame per keystroke.
const HEARTBEAT_MS = 3000;

/**
 * Turns raw composer activity into an ephemeral typing signal: one `true` on the
 * first keystroke, a throttled `true` heartbeat while typing continues, and a
 * `false` on send, on going idle, or on unmount. `onChange` does the emitting, so
 * this hook stays decoupled from the socket and is easy to drive in a test.
 *
 * `idleMs` / `heartbeatMs` are test seams; production leaves them at the defaults.
 */
export function useComposingSignal(
  onChange: (typing: boolean) => void,
  { idleMs = IDLE_MS, heartbeatMs = HEARTBEAT_MS }: { idleMs?: number; heartbeatMs?: number } = {},
): { notify: () => void; stop: () => void } {
  // Held in refs so notify/stop stay referentially stable across renders — the
  // composer wires them once, and a parent re-render never re-arms the timers.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const active = useRef(false);
  const lastEmit = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
    if (active.current) {
      active.current = false;
      onChangeRef.current(false);
    }
  }, []);

  const notify = useCallback(() => {
    const now = Date.now();
    if (!active.current) {
      active.current = true;
      lastEmit.current = now;
      onChangeRef.current(true);
    } else if (now - lastEmit.current >= heartbeatMs) {
      lastEmit.current = now;
      onChangeRef.current(true);
    }
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(stop, idleMs);
  }, [idleMs, heartbeatMs, stop]);

  // Leaving the composer (navigation, Room teardown) mid-compose must retract the
  // signal so peers don't see a ghost indicator.
  useEffect(() => stop, [stop]);

  return { notify, stop };
}
