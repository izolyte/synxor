import { useCallback, useEffect, useState } from "react";
import { Wordmark } from "~/shared/components/Wordmark";
import { CopyButton } from "~/features/room/components/CopyButton";
import { CountdownLine } from "~/features/room/components/CountdownLine";
import { WaitingForReceiver } from "~/features/room/components/WaitingForReceiver";
import { PresenceCluster } from "~/features/room/components/PresenceCluster";
import { PresenceNotice } from "~/features/room/components/PresenceNotice";
import { ConnectionAlert } from "~/features/room/components/ConnectionAlert";
import { TerminalNotice } from "~/features/room/components/TerminalNotice";
import { DropZone } from "~/features/room/components/DropZone";
import { TextPasteField } from "~/features/room/components/TextPasteField";
import { SelfIdentity } from "~/features/room/components/SelfIdentity";
import { RoomStream } from "~/features/room/components/RoomStream";
import { TypingIndicator } from "~/features/room/components/TypingIndicator";
import { DeliveryFlash } from "~/features/room/components/DeliveryFlash";
import { ExpiryWarningNotice } from "~/features/room/components/ExpiryWarningNotice";
import { DeleteRoomControl } from "~/features/room/components/DeleteRoomControl";
import { useCountdown } from "~/features/room/hooks/useCountdown";
import {
  useRoomSocket,
  type SocketFactory,
  type RoomSocketStatus,
} from "~/features/room/hooks/useRoomSocket";
import { useComposingSignal } from "~/features/room/hooks/useComposingSignal";
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
 * expiry); the countdown then simply doesn't render. `createdAt` pairs with it to
 * scale the approaching-Expiry warning to the Room's lifespan. `socketFactory` /
 * `uploader` are test seams; production leaves them undefined and dials the real
 * server.
 */
export function RoomShareView({
  roomCode,
  expiresAt,
  createdAt,
  token,
  role = "sender",
  socketFactory,
  uploader,
  transferHistory = [],
}: {
  roomCode: string;
  expiresAt: string | undefined;
  createdAt?: string;
  token?: string;
  role?: RoomRole;
  socketFactory?: SocketFactory;
  uploader?: Uploader;
  transferHistory?: TransferHistory;
}) {
  const isSender = role === "sender";
  const countdown = useCountdown(expiresAt, createdAt);
  const expired = countdown?.phase === "expired";

  // Expiry never severs a Transfer mid-flight. Past the TTL we hold the Room open
  // while any Transfer is still moving and seal only once it lands
  // (docs/design/15-edge-cases.md). `sealed` latches so cutting the socket — which
  // empties `transfers` — can't un-seal the Room and flip it back open.
  const [sealed, setSealed] = useState(false);
  const socketToken = sealed ? undefined : token;
  const {
    status,
    receiverCount,
    roster,
    presenceChange,
    transfers,
    texts,
    delivered,
    closed,
    self,
    identities,
    typing,
    sendText,
    closeRoom,
    rename,
    setTyping,
  } = useRoomSocket(socketToken, socketFactory);
  const composing = useComposingSignal(setTyping);
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
    identityOverrides: identities,
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
    return <TerminalNotice variant="closed" />;
  }

  if (sealed || (expired && !transferActive)) {
    return <TerminalNotice variant="expired" />;
  }

  const joinUrl = buildUrl("/join", { code: roomCode });

  // While the Sender is alone, the Room becomes the share surface: the invite (big
  // code, copy/share, QR) owns the body and the header drops its duplicate chrome.
  // The moment a Participant joins — or on a Receiver's own session — it collapses
  // into the live stream. A terminally lost socket isn't "waiting"; ConnectionAlert
  // owns that, so fall through to the stream.
  const present = receiverCount > 0;
  const alone = isSender && !present && status !== "lost";

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
            <div className="flex items-center gap-3">
              <PresenceCluster roster={roster} self={self} />
              {isSender && <DeleteRoomControl onClose={closeRoom} />}
            </div>
          </div>

          {/* Once someone's here (or on a Receiver's own session) the header carries
              the code and copy actions; while alone they live in the share surface
              below, so nothing's shown twice. */}
          {!alone && (
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
          )}

          <div className="flex flex-col gap-1">
            {countdown && <CountdownLine label={countdown.label} phase={countdown.phase} />}
            {status === "lost" ? (
              <ConnectionAlert />
            ) : (
              !alone && <ReceiverPresence status={status} receiverCount={receiverCount} />
            )}
          </div>
        </header>

        {alone ? (
          <WaitingForReceiver roomCode={roomCode} joinUrl={joinUrl} status={status} />
        ) : (
          <>
            <RoomStream rows={rows} onCopy={clipboard.copy} />

            {/* Ephemeral — sits at the foot of the stream, above the composer, and is
                never part of the persisted feed. */}
            <TypingIndicator identities={[...typing.values()]} />
          </>
        )}

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
          <SelfIdentity self={self} onRename={rename} />
          {/* Past the Expiry the Room is held open only to land an in-flight
              Transfer — seal the composer so nothing new goes into a dead Room. */}
          <TextPasteField
            onSend={handleSend}
            disabled={expired}
            // Before anyone's here, the composer invites a first Transfer that'll
            // be waiting for them on arrival (#99).
            placeholder={alone ? "Start typing — they'll see it when they arrive…" : undefined}
            onComposing={composing.notify}
            onComposingStop={composing.stop}
          />
        </footer>
      </main>

      {/* The Receiver's big Delivery moment on a completed download. */}
      <DeliveryFlash delivered={delivered} transfers={transfers} />

      {/* One-shot heads-up as the Room nears Expiry — fires once, then clears. */}
      <ExpiryWarningNotice phase={countdown?.phase} />

      {/* Ephemeral "… joined / … left" as Participants come and go. */}
      <PresenceNotice change={presenceChange} self={self} />
    </div>
  );
}

// The header presence line once the Room is live — a dot plus words (never colour
// alone), read as a polite live region so a Sender on a screen reader hears the
// join/reconnect land. The alone-and-waiting cue is owned by the share surface, so
// this only speaks up once someone's here or the socket blips. role="status" makes
// presence flips arriving async over the socket announce instead of passing silently.
const PRESENCE_ROW = "flex items-center justify-center gap-2 text-sm";
function ReceiverPresence({
  status,
  receiverCount,
}: {
  status?: RoomSocketStatus;
  receiverCount: number;
}) {
  if (status === "disconnected") {
    return (
      <p role="status" className={`${PRESENCE_ROW} text-muted-foreground`}>
        <span aria-hidden="true" className="size-3 rounded-full bg-[var(--color-room-empty)]" />
        Reconnecting…
      </p>
    );
  }

  if (receiverCount === 0) return null;

  return (
    <p role="status" className={`${PRESENCE_ROW} text-foreground`}>
      <span aria-hidden="true" className="size-3 rounded-full bg-[var(--color-room-live)]" />
      {receiverCount === 1 ? "Receiver connected" : `${receiverCount} Receivers connected`}
    </p>
  );
}
