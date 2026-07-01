import { ScreenHeader } from "~/shared/components/ScreenHeader";
import { RoomCode } from "~/features/room/components/RoomCode";
import { CopyButton } from "~/features/room/components/CopyButton";
import { CountdownLine } from "~/features/room/components/CountdownLine";
import { WaitingForReceiver } from "~/features/room/components/WaitingForReceiver";
import { RoomNotice } from "~/features/room/components/RoomNotice";
import { useCountdown } from "~/features/room/hooks/useCountdown";
import { useRoomSocket } from "~/features/room/hooks/useRoomSocket";
import { buildUrl } from "~/shared/utils/url";

/**
 * Sender's Room view while waiting for a Receiver: the Room Code front and centre,
 * one tap to copy the code or the prefilled join link, and a live expiry countdown.
 * Once expired the whole view collapses to a single next step.
 *
 * `expiresAt` is absent for a Receiver's session (its join response carries no
 * expiry); the countdown then simply doesn't render.
 */
export function RoomShareView({
  roomCode,
  expiresAt,
  token,
}: {
  roomCode: string;
  expiresAt: string | undefined;
  token?: string;
}) {
  const countdown = useCountdown(expiresAt);
  const livePresenceToken = countdown?.phase === "expired" ? undefined : token;
  const { status, receiverCount } = useRoomSocket(livePresenceToken);

  if (countdown?.phase === "expired") {
    return (
      <RoomNotice
        title="Room expired"
        message="This Room has expired. Create a new Room to send files."
      />
    );
  }

  const joinUrl = buildUrl('/join', { code: roomCode });

  return (
    <>
      <ScreenHeader
        title="Room ready"
        description="Share the Room Code or link to invite a Receiver."
      />

      <RoomCode code={roomCode} receiverCount={receiverCount} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CopyButton
          value={roomCode}
          label="Copy code"
          copiedLabel="Copied"
          errorLabel="Couldn't copy — select the code above and copy it manually."
        />
        <CopyButton
          value={joinUrl}
          label="Copy link"
          copiedLabel="Link copied"
          errorLabel="Couldn't copy the link — select it manually:"
          fallbackText={joinUrl}
          variant="outline"
        />
      </div>

      {/* Ambient status, grouped tighter than the action rhythm above it. */}
      <div className="flex flex-col gap-2">
        {countdown && <CountdownLine label={countdown.label} phase={countdown.phase} />}
        <WaitingForReceiver status={status} receiverCount={receiverCount} />
      </div>
    </>
  );
}
