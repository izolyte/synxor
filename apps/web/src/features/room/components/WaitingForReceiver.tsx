import { RoomCode } from "~/features/room/components/RoomCode";
import { RoomQrCode } from "~/features/room/components/RoomQrCode";
import { CopyButton } from "~/features/room/components/CopyButton";
import { ShareLinkButton } from "~/features/room/components/ShareLinkButton";
import type { RoomSocketStatus } from "~/features/room/hooks/useRoomSocket";

// What the native share sheet announces the link as.
const SHARE_TITLE = "Join my synxor room";

/**
 * The waiting room *is* the share surface (docs/design: "share the code or QR" —
 * nobody should hunt for how to invite). While the Sender is alone it fills the
 * Room with the three ways in — the code in full, copy/share actions, and a
 * scannable QR of the same join link — under a plain invitation, with a live cue
 * that the Room is up and listening.
 *
 * It's shown only to a Sender with no one else here yet; the moment a Participant
 * joins, {@link RoomShareView} collapses this into the live stream. A dropped
 * socket softens the cue to "Reconnecting…" rather than pretending someone might
 * still walk in.
 */
export function WaitingForReceiver({
  roomCode,
  joinUrl,
  status,
}: {
  roomCode: string;
  joinUrl: string;
  status?: RoomSocketStatus;
}) {
  const reconnecting = status === "disconnected";

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-8 text-center">
      <h2 className="text-foreground text-lg font-semibold tracking-[var(--tracking-tight)]">
        Room&apos;s ready — bring someone in
      </h2>

      <div className="mt-6 mb-1">
        <RoomCode code={roomCode} />
      </div>

      <div className="mt-3.5 mb-6 flex w-full max-w-[340px] gap-2.5">
        <CopyButton
          value={roomCode}
          label="Copy code"
          copiedLabel="Copied"
          errorLabel="Couldn't copy — select the code above and copy it manually."
          variant="outline"
        />
        <ShareLinkButton url={joinUrl} title={SHARE_TITLE} />
      </div>

      <RoomQrCode value={joinUrl} label="Room join QR code" />

      <p role="status" className="text-muted-foreground mt-6 flex items-center gap-2.5 text-sm">
        <span aria-hidden="true" className="relative inline-flex size-2 items-center justify-center">
          {!reconnecting && (
            <span className="absolute -inset-1 rounded-full border border-[var(--color-primary)] motion-safe:animate-[ping_1.8s_var(--ease-out)_infinite]" />
          )}
          <span
            className={`size-2 rounded-full ${
              reconnecting ? "bg-[var(--color-room-empty)]" : "bg-[var(--color-primary)]"
            }`}
          />
        </span>
        {reconnecting ? "Reconnecting…" : "Waiting for someone to join…"}
      </p>
    </div>
  );
}
