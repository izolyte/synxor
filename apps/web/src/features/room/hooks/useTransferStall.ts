import { useEffect, useState } from "react";
import {
  ALMOST_DONE_PERCENT,
  STALL_ALMOST_MS,
  STALL_SLOW_MS,
} from "~/features/room/constants/transfer";

export type StallState = "slow" | "almost" | null;

export interface StallOptions {
  slowAfterMs?: number;
  almostAfterMs?: number;
}

/**
 * Flags a Transfer that has stopped moving. No chunk for `slowAfterMs` reads as
 * "slow" — the pipe is quiet, not the Transfer failed (docs/design/15-edge-cases.md).
 * A Transfer parked at/above ALMOST_DONE_PERCENT gets the longer `almostAfterMs`
 * window and the gentler "almost" state, since it's finishing, not stuck. Any
 * percent change or a flip to inactive rearms the clock from zero; an inactive
 * Transfer (done, errored, idle) never stalls.
 *
 * Thresholds are injectable so specs can drive the states without real 10s waits —
 * same seam as useDeliveryFlash's `displayMs`.
 */
export function useTransferStall(
  percent: number,
  active: boolean,
  { slowAfterMs = STALL_SLOW_MS, almostAfterMs = STALL_ALMOST_MS }: StallOptions = {},
): StallState {
  const [state, setState] = useState<StallState>(null);

  useEffect(() => {
    // A moving bar is never stalled: reset, then re-arm off the new percent.
    setState(null);
    if (!active) return;
    const almostDone = percent >= ALMOST_DONE_PERCENT;
    const timer = setTimeout(
      () => setState(almostDone ? "almost" : "slow"),
      almostDone ? almostAfterMs : slowAfterMs,
    );
    return () => clearTimeout(timer);
  }, [percent, active, slowAfterMs, almostAfterMs]);

  return state;
}
