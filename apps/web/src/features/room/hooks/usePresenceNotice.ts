import { useEffect, useRef, useState } from "react";
import type {
  PresenceChange,
  RoomSocketState,
} from "~/features/room/hooks/useRoomSocket";
import type { ParticipantIdentity } from "~/features/room/constants/transfer";

export interface PresenceNoticeItem {
  seq: number;
  type: "join" | "leave";
  identity: ParticipantIdentity;
}

/**
 * Turns the socket's latest join/leave into a one-shot notice feed: each new
 * presence change surfaces once, for `displayMs`, then clears — the transient
 * house-notice idiom (DeliveryFlash, ExpiryWarningNotice), never a lingering
 * roster log. Back-to-back changes queue so each still gets its moment. The
 * change present on first mount is adopted as already-seen, so opening the Room
 * (or a reconnect that replays presence) doesn't flash stale arrivals. Your own
 * join isn't news to you, so it's skipped.
 */
export function usePresenceNotice(
  change: PresenceChange | null,
  self: RoomSocketState["self"],
  displayMs = 3200,
): PresenceNoticeItem | null {
  const [current, setCurrent] = useState<PresenceNoticeItem | null>(null);
  const seenSeqRef = useRef<number | null>(null);
  const queueRef = useRef<PresenceNoticeItem[]>([]);
  const selfKey = self?.key;

  useEffect(() => {
    if (seenSeqRef.current === null) {
      seenSeqRef.current = change?.seq ?? 0;
      return;
    }
    if (!change || change.seq <= seenSeqRef.current) return;
    seenSeqRef.current = change.seq;
    if (change.type === "join" && change.identity.key === selfKey) return;

    queueRef.current.push({ seq: change.seq, type: change.type, identity: change.identity });
    setCurrent((shown) => shown ?? queueRef.current.shift() ?? null);
  }, [change, selfKey]);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setCurrent(queueRef.current.shift() ?? null), displayMs);
    return () => clearTimeout(timer);
  }, [current, displayMs]);

  return current;
}
