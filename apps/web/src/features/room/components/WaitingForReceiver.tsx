/**
 * Sender-side Room presence while no Receiver has joined. Static "empty" today;
 * #12 will drive it live as a Receiver arrives. A dot plus a label — the status is
 * never carried by colour alone.
 */
export function WaitingForReceiver() {
  return (
    <p className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
      <span aria-hidden="true" className="size-3 rounded-full bg-[var(--color-room-empty)]" />
      Waiting for Receiver
    </p>
  );
}
