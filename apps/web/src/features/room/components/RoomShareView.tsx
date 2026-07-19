import { useEffect, useState } from "react";
import { ScreenHeader } from "~/shared/components/ScreenHeader";
import { RoomCode } from "~/features/room/components/RoomCode";
import { CopyButton } from "~/features/room/components/CopyButton";
import { CountdownLine } from "~/features/room/components/CountdownLine";
import { WaitingForReceiver } from "~/features/room/components/WaitingForReceiver";
import { ConnectionAlert } from "~/features/room/components/ConnectionAlert";
import { RoomNotice } from "~/features/room/components/RoomNotice";
import { DropZone } from "~/features/room/components/DropZone";
import { TextPasteField } from "~/features/room/components/TextPasteField";
import { IncomingTransfers } from "~/features/room/components/IncomingTransfers";
import { DeliveryFlash } from "~/features/room/components/DeliveryFlash";
import { TransferLog } from "~/features/room/components/TransferLog";
import { useCountdown } from "~/features/room/hooks/useCountdown";
import { useRoomSocket, type SocketFactory } from "~/features/room/hooks/useRoomSocket";
import type { Uploader } from "~/features/room/hooks/useFileUploads";
import { useTransferLogRows } from "~/features/room/hooks/useTransferLog";
import { useClipboard } from "~/features/room/hooks/useClipboard";
import type { RoomRole } from "~/features/room/services/room-session.service";
import type { TransferHistory } from "~/features/room/utils/transfer-log";
import { resolveApiOrigin } from "~/shared/utils/api-origin";
import { buildUrl } from "~/shared/utils/url";

/**
 * Sender's Room view while waiting for a Receiver: the Room Code front and centre,
 * one tap to copy the code or the prefilled join link, and a live expiry countdown.
 * Once expired the whole view collapses to a single next step.
 *
 * `expiresAt` is absent for a Receiver's session (its join response carries no
 * expiry); the countdown then simply doesn't render.
 *
 * `socketFactory` is a test seam (mirrors DropZone's `uploader`): production leaves
 * it undefined and useRoomSocket dials the real server.
 */
export function RoomShareView({
  roomCode,
  expiresAt,
  token,
  role = "sender",
  socketFactory,
  uploader,
  transferHistory = [],
}: {
  roomCode: string;
  expiresAt: string | undefined;
  token?: string;
  role?: RoomRole;
  socketFactory?: SocketFactory;
  /** Test seam forwarded to DropZone; production uses the real chunked uploader. */
  uploader?: Uploader;
  /** Persisted Transfer history for the Log, fetched by the route (RoomPage). */
  transferHistory?: TransferHistory;
}) {
  const countdown = useCountdown(expiresAt);
  const expired = countdown?.phase === "expired";

  // Expiry never severs a Transfer mid-flight. Past the TTL we hold the Room open
  // while any Transfer is still moving and seal only once it lands
  // (docs/design/15-edge-cases.md). `sealed` latches so cutting the socket — which
  // empties `transfers` — can't un-seal the Room and flip it back open.
  const [sealed, setSealed] = useState(false);
  const socketToken = sealed ? undefined : token;
  const { status, receiverCount, transfers, texts, delivered, sendText } = useRoomSocket(
    socketToken,
    socketFactory,
  );
  // Same origin the socket rides; only resolved with a live token (client-only).
  const apiOrigin = socketToken ? resolveApiOrigin(import.meta.env) : undefined;

  // `transfers` is the whole-Room socket feed, which covers a Receiver's download
  // but NOT a Sender's own upload until the server echoes its first progress
  // broadcast — so fold in DropZone's local upload state, or a file dropped in
  // the last RTT before expiry could seal the Room mid-upload.
  const [senderUploading, setSenderUploading] = useState(false);
  const transferActive = transfers.some((t) => !t.complete) || senderUploading;
  useEffect(() => {
    if (expired && !transferActive) setSealed(true);
  }, [expired, transferActive]);

  const clipboard = useClipboard();
  const logRows = useTransferLogRows({
    history: transferHistory,
    transfers,
    texts,
    delivered,
    token: socketToken,
    apiOrigin,
  });

  if (sealed || (expired && !transferActive)) {
    return (
      <RoomNotice
        title="Room expired"
        message="This Room has expired. Create a new Room to send files."
      />
    );
  }

  const joinUrl = buildUrl("/join", { code: roomCode });

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

      {/* Ambient status, grouped tighter than the action rhythm above it. A
          terminally lost socket takes over the presence slot: the count is stale,
          and the one thing that helps now is a refresh. */}
      <div className="flex flex-col gap-2">
        {countdown && <CountdownLine label={countdown.label} phase={countdown.phase} />}
        {status === "lost" ? (
          <ConnectionAlert />
        ) : (
          <WaitingForReceiver status={status} receiverCount={receiverCount} />
        )}
      </div>

      {role === "sender" ? (
        <div className="flex flex-col gap-3">
          <DropZone
            token={socketToken}
            apiOrigin={apiOrigin}
            delivered={delivered}
            uploader={uploader}
            onActiveChange={setSenderUploading}
          />
          <TextPasteField onSend={sendText} />
        </div>
      ) : (
        <>
          <IncomingTransfers
            transfers={transfers}
            texts={texts}
            token={socketToken}
            apiOrigin={apiOrigin}
            delivered={delivered}
          />
          {/* Receiver-only: the big confirmation moment. The Sender reads Delivery
              off its own file rows above, not a full-screen flash. */}
          <DeliveryFlash delivered={delivered} transfers={transfers} />
        </>
      )}

      {/* Shared history + live feed, for both roles. */}
      <TransferLog rows={logRows} onCopy={clipboard.copy} />
    </>
  );
}
