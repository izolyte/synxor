import { useEffect, useRef, useState } from "react";
import type { TransferProgressPayload } from "~/features/room/constants/transfer";

export interface DeliveryFlashItem {
  transferId: string;
  /** Resolved from the live Transfer when known; the flash falls back to a bare
   *  "Delivered" when a delivery lands before its progress row. */
  fileName?: string;
}

/**
 * Turns the growing set of delivered transferIds into a one-shot flash feed: each
 * newly-delivered Transfer surfaces exactly once, for `displayMs`, then clears.
 * Deliveries that pile up while one is showing queue behind it so each still gets
 * its moment (Delivery is the payoff — docs/design/07-motion.md: fires once, never
 * loops). Ids present on first mount are treated as already-seen: the flash is for
 * deliveries that happen live, not history replayed on a reconnect.
 */
export function useDeliveryFlash(
  delivered: ReadonlySet<string>,
  transfers: TransferProgressPayload[],
  displayMs = 2400,
): DeliveryFlashItem | null {
  const [current, setCurrent] = useState<DeliveryFlashItem | null>(null);
  const seenRef = useRef<Set<string> | null>(null);
  const queueRef = useRef<DeliveryFlashItem[]>([]);
  // Read transfers through a ref so enqueueing keys off `delivered` alone; the
  // filename is a nice-to-have looked up at the moment a delivery lands.
  const transfersRef = useRef(transfers);
  transfersRef.current = transfers;

  useEffect(() => {
    // First run: seed from whatever's already delivered so mounting mid-session
    // doesn't replay past deliveries as flashes.
    if (seenRef.current === null) {
      seenRef.current = new Set(delivered);
      return;
    }
    const seen = seenRef.current;
    for (const id of delivered) {
      if (seen.has(id)) continue;
      seen.add(id);
      queueRef.current.push({
        transferId: id,
        fileName: transfersRef.current.find((t) => t.transferId === id)?.fileName,
      });
    }
    // Kick the display loop if it's idle.
    setCurrent((shown) => shown ?? queueRef.current.shift() ?? null);
  }, [delivered]);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => {
      setCurrent(queueRef.current.shift() ?? null);
    }, displayMs);
    return () => clearTimeout(timer);
  }, [current, displayMs]);

  return current;
}
