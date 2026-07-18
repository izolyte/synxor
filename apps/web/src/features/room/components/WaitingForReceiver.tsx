import type { RoomSocketStatus } from "~/features/room/hooks/useRoomSocket";

const ROW = "flex items-center justify-center gap-2 text-sm";

/**
 * Sender-side Room presence. With no Receiver yet it reads "Waiting for Receiver";
 * once one or more connect it switches to a live count. A dropped socket reads
 * "Reconnecting…" rather than lying that a Receiver is still there (or flipping
 * straight back to waiting on a transient blip) — socket.io re-emits presence once
 * it's back. A dot plus a label — the status is never carried by colour alone.
 *
 * A connected Receiver reads in full-contrast ink; waiting and reconnecting stay
 * muted, in step with the ambient countdown beside them. The Room "feels different"
 * once someone's there (PRODUCT) — the line gains weight, not just a colour swap.
 *
 * role="status" makes the line a polite live region: presence flips arrive async
 * over the socket, so a Sender on a screen reader hears "Receiver connected" /
 * "Reconnecting…" announced instead of the change passing silently.
 */
export function WaitingForReceiver({
  status,
  receiverCount = 0,
}: {
  status?: RoomSocketStatus;
  receiverCount?: number;
}) {
  // A terminally lost connection is owned by ConnectionAlert; echoing a stale
  // presence count here would only contradict it.
  if (status === "lost") return null;

  if (status === "disconnected") {
    return (
      <p role="status" className={`${ROW} text-muted-foreground`}>
        <span aria-hidden="true" className="size-3 rounded-full bg-[var(--color-room-empty)]" />
        Reconnecting…
      </p>
    );
  }

  const present = receiverCount > 0;
  const color = present ? "--color-room-live" : "--color-room-empty";
  const label = !present
    ? "Waiting for Receiver"
    : receiverCount === 1
      ? "Receiver connected"
      : `${receiverCount} Receivers connected`;

  return (
    <p role="status" className={`${ROW} ${present ? "text-foreground" : "text-muted-foreground"}`}>
      <span aria-hidden="true" className={`size-3 rounded-full bg-[var(${color})]`} />
      {label}
    </p>
  );
}
