import { useCallback, useEffect, useState } from "react";
import { Wordmark } from "~/shared/components/Wordmark";
import { CenteredScreen } from "~/shared/components/CenteredScreen";
import { ScreenColumn } from "~/shared/components/ScreenColumn";
import { CopyButton } from "~/features/room/components/CopyButton";
import { CountdownLine } from "~/features/room/components/CountdownLine";
import { WaitingForReceiver } from "~/features/room/components/WaitingForReceiver";
import { ConnectionAlert } from "~/features/room/components/ConnectionAlert";
import { RoomNotice } from "~/features/room/components/RoomNotice";
import { DropZone } from "~/features/room/components/DropZone";
import { TextPasteField } from "~/features/room/components/TextPasteField";
import { RoomStream } from "~/features/room/components/RoomStream";
import { DeliveryFlash } from "~/features/room/components/DeliveryFlash";
import { DeleteRoomControl } from "~/features/room/components/DeleteRoomControl";
import { useCountdown } from "~/features/room/hooks/useCountdown";
import { useRoomSocket, type SocketFactory } from "~/features/room/hooks/useRoomSocket";
import { useOwnTransferIds } from "~/features/room/hooks/useOwnTransferIds";
import type { Uploader } from "~/features/room/hooks/useFileUploads";
import { useTransferLogRows } from "~/features/room/hooks/useTransferLog";
import { useClipboard } from "~/features/room/hooks/useClipboard";
import type { RoomRole } from "~/features/room/services/room-session.service";
import type { TransferHistory } from "~/features/room/utils/transfer-log";
import { resolveApiOrigin } from "~/shared/utils/api-origin";
import { buildUrl } from "~/shared/utils/url";

/**
 * The Room as a two-way stream: every Participant sees one chronological feed of
 * Text Snippets, Links, and files, and every Participant can add to it through
 * the pinned composer. Own messages align right, others left. The creator keeps
 * the destructive controls (Delete Room); the header carries the Room Code to
 * share, presence, and the expiry countdown.
 *
 * A full-height shell — the one screen that breaks the app's centered narrow
 * column so the composer can pin to the bottom.
 *
 * `expiresAt` is absent for a Receiver's session (its join response carries no
 * expiry); the countdown then simply doesn't render. `socketFactory` / `uploader`
 * are test seams; production leaves them undefined and dials the real server.
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
  uploader?: Uploader;
  transferHistory?: TransferHistory;
}) {
  const isSender = role === "sender";
  const countdown = useCountdown(expiresAt);
  const expired = countdown?.phase === "expired";

  // Expiry never severs a Transfer mid-flight. Past the TTL we hold the Room open
  // while any Transfer is still moving and seal only once it lands
  // (docs/design/15-edge-cases.md). `sealed` latches so cutting the socket — which
  // empties `transfers` — can't un-seal the Room and flip it back open.
  const [sealed, setSealed] = useState(false);
  const socketToken = sealed ? undefined : token;
  const { status, receiverCount, transfers, texts, delivered, closed, sendText, closeRoom } =
    useRoomSocket(socketToken, socketFactory);
  const apiOrigin = socketToken ? resolveApiOrigin(import.meta.env) : undefined;

  const [senderUploading, setSenderUploading] = useState(false);
  const transferActive = transfers.some((t) => !t.complete) || senderUploading;
  useEffect(() => {
    if (expired && !transferActive) setSealed(true);
  }, [expired, transferActive]);

  const own = useOwnTransferIds(roomCode);
  const clipboard = useClipboard();
  const rows = useTransferLogRows({
    history: transferHistory,
    transfers,
    texts,
    delivered,
    ownIds: own.ids,
    isSender,
    token: socketToken,
    apiOrigin,
  });

  // Record the id the server minted so this message stays attributed to us across
  // a reload — the server never broadcasts our own send back to us.
  const handleSend = useCallback(
    async (text: string) => {
      const ack = await sendText(text);
      if ("transferId" in ack) own.add(ack.transferId);
    },
    [sendText, own],
  );

  if (closed) {
    return (
      <TerminalNotice
        title="Room closed"
        message="The Sender closed this Room. Create a new Room to send files."
      />
    );
  }

  if (sealed || (expired && !transferActive)) {
    return (
      <TerminalNotice
        title="Room expired"
        message="This Room reached its Expiry — every Transfer in it is gone. Create a new Room to send more."
      />
    );
  }

  const joinUrl = buildUrl("/join", { code: roomCode });

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto flex min-h-dvh w-full max-w-[var(--width-content)] flex-col px-4">
        <header className="flex shrink-0 flex-col gap-3 border-b border-[var(--border)] py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Wordmark>synxor</Wordmark>
              <h1 className="text-foreground text-xl font-bold tracking-[var(--tracking-tight)]">
                Room ready
              </h1>
            </div>
            {isSender && <DeleteRoomControl onClose={closeRoom} />}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span
              aria-label={`Room Code: ${roomCode.split("").join(" ")}`}
              className="text-foreground select-all font-mono text-lg font-bold tracking-[var(--tracking-wide)]"
            >
              {roomCode}
            </span>
            <div className="flex gap-2">
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
          </div>

          <div className="flex flex-col gap-1">
            {countdown && <CountdownLine label={countdown.label} phase={countdown.phase} />}
            {status === "lost" ? (
              <ConnectionAlert />
            ) : (
              <WaitingForReceiver status={status} receiverCount={receiverCount} />
            )}
          </div>
        </header>

        <RoomStream rows={rows} onCopy={clipboard.copy} />

        <footer className="flex shrink-0 flex-col gap-3 border-t border-[var(--border)] py-3">
          {isSender && (
            <DropZone
              token={socketToken}
              apiOrigin={apiOrigin}
              delivered={delivered}
              uploader={uploader}
              onActiveChange={setSenderUploading}
            />
          )}
          {/* Past the Expiry the Room is held open only to land an in-flight
              Transfer — seal the composer so nothing new goes into a dead Room. */}
          <TextPasteField onSend={handleSend} disabled={expired} />
        </footer>
      </main>

      {/* The Receiver's big Delivery moment on a completed download. */}
      <DeliveryFlash delivered={delivered} transfers={transfers} />
    </div>
  );
}

// Terminal Room states keep the app's centered narrow layout — only the live Room
// takes over the full-height shell.
function TerminalNotice({ title, message }: { title: string; message: string }) {
  return (
    <CenteredScreen>
      <ScreenColumn>
        <RoomNotice title={title} message={message} />
      </ScreenColumn>
    </CenteredScreen>
  );
}
