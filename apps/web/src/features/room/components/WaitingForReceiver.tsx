import type { RoomSocketStatus } from "~/features/room/hooks/useRoomSocket";

/**
 * Sender-side Room presence. With no Receiver yet it reads "Waiting for Receiver";
 * once one or more connect it switches to a live count. A dropped socket reads
 * "Reconnecting…" rather than lying that a Receiver is still there (or flipping
 * straight back to waiting on a transient blip) — socket.io re-emits presence once
 * it's back. A dot plus a label — the status is never carried by colour alone.
 */
export function WaitingForReceiver({
  status,
  receiverCount = 0,
}: {
  status?: RoomSocketStatus;
  receiverCount?: number;
}) {
  if (status === "disconnected") {
    return (
      <p className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
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
    <p className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
      <span aria-hidden="true" className={`size-3 rounded-full bg-[var(${color})]`} />
      {label}
    </p>
  );
}
