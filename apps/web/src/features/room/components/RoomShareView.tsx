import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
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
import { RoomMenu } from "~/features/room/components/RoomMenu";
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
import { sharedIntake, type SharedPayload } from "~/features/room/services/shared-intake.service";
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

  // Any Participant can upload now, so this tracks a local upload in flight (not
  // just the Sender's) — the seal window needs it because an own upload isn't in
  // the socket `transfers` feed until the server echoes its first progress event.
  const [uploading, setUploading] = useState(false);
  const transferActive = transfers.some((t) => !t.complete) || uploading;
  useEffect(() => {
    if (expired && !transferActive) setSealed(true);
  }, [expired, transferActive]);

  const own = useOwnTransferIds(roomCode);
  const clipboard = useClipboard();

  // A share into the PWA opened this Room (see routes/share.tsx). Drain the handoff
  // once on mount so the composer opens pre-filled with the shared text and its
  // files land queued for send.
  const [shared, setShared] = useState<SharedPayload | null>(null);
  const drainedShare = useRef(false);
  useEffect(() => {
    if (drainedShare.current) return;
    drainedShare.current = true;
    setShared(sharedIntake.take());
  }, []);

  // Bridge the Drop Zone's file picker to the composer's paperclip: the Drop Zone
  // owns the queue + input and hands its open function up, the bar triggers it.
  const pickerRef = useRef<() => void>(() => {});
  const registerPicker = useCallback((open: () => void) => {
    pickerRef.current = open;
  }, []);
  const openPicker = useCallback(() => pickerRef.current(), []);
  const rows = useTransferLogRows({
    history: transferHistory,
    transfers,
    texts,
    delivered,
    ownIds: own.ids,
    selfKey: self?.key,
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
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="mx-auto flex min-h-dvh w-full max-w-[var(--width-content)] flex-col">
        {/* The page's heading for the document outline; the visible chrome is the
            glass bar below, whose code + status carry the same information. */}
        <h1 className="sr-only">Room ready</h1>

        {/* The glassy header bar: brand mark, the Room Code + status, the countdown
            pill, the presence cluster, and the overflow menu. */}
        <header className="sticky top-0 z-[var(--z-sticky)] flex items-center gap-2.5 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--color-background)_74%,transparent)] px-3 py-2.5 backdrop-blur-[14px] backdrop-saturate-150">
          <RoomBrandMark />
          <div className="flex min-w-0 flex-col leading-tight">
            {/* While alone the big Code owns the share surface below, so the bar
                shows the wordmark instead of repeating it. */}
            <span className="truncate font-mono text-sm font-medium tracking-[var(--tracking-wide)] text-[var(--color-ink)]">
              {alone ? "synxor" : roomCode}
            </span>
            <span className="truncate font-mono text-[0.625rem] tracking-[var(--tracking-wide)] text-[var(--color-ink-subtle)]">
              {alone ? "waiting · no account" : "no account"}
            </span>
          </div>
          <span className="flex-1" />
          {countdown && <CountdownLine label={countdown.label} phase={countdown.phase} />}
          <PresenceCluster roster={roster} self={self} />
          {isSender && (
            <RoomMenu>
              <DeleteRoomControl onClose={closeRoom} />
            </RoomMenu>
          )}
        </header>

        {/* A terminally lost socket is a visible alert with the fix; the live/reconnect
            presence rides the avatar cluster visually and is announced here for
            screen readers (role="status"). */}
        {status === "lost" ? (
          <div className="px-3 pt-3">
            <ConnectionAlert />
          </div>
        ) : (
          !alone && <ReceiverPresence status={status} receiverCount={receiverCount} />
        )}

        {alone ? (
          <WaitingForReceiver roomCode={roomCode} joinUrl={joinUrl} status={status} />
        ) : (
          <>
            <RoomStream rows={rows} onCopy={clipboard.copy} />

            {/* Ephemeral — sits at the foot of the stream, above the composer, and is
                never part of the persisted feed. */}
            <div className="px-3">
              <TypingIndicator identities={[...typing.values()]} />
            </div>
          </>
        )}

        <footer className="shrink-0 border-t border-[var(--border)] bg-[color-mix(in_oklab,var(--color-background)_78%,transparent)] px-3 py-2.5 backdrop-blur-[14px] backdrop-saturate-150">
          <div className="flex flex-col gap-2">
            <SelfIdentity self={self} onRename={rename} />
            {/* Two-way transfers: every Participant gets the attach + drop affordance,
                not just the Sender. The Drop Zone hands its picker to the composer's
                paperclip and shows the queue + drop target. */}
            <DropZone
              token={socketToken}
              apiOrigin={apiOrigin}
              delivered={delivered}
              uploader={uploader}
              onActiveChange={setUploading}
              registerPicker={registerPicker}
              initialFiles={shared?.files}
            />
            {/* Past the Expiry the Room is held open only to land an in-flight
                Transfer — seal the composer so nothing new goes into a dead Room. */}
            <TextPasteField
              onSend={handleSend}
              onAttach={openPicker}
              disabled={expired}
              initialText={shared?.text}
              // Before anyone's here, the composer invites a first Transfer that'll
              // be waiting for them on arrival (#99).
              placeholder={alone ? "Start typing — they'll see it when they arrive…" : undefined}
              onComposing={composing.notify}
              onComposingStop={composing.stop}
            />
          </div>
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

// The brand mark: the Exchange glyph (two opposed arrows — the two-way transfer)
// on the primary tile, matching the app icon.
function RoomBrandMark() {
  return (
    <span
      aria-hidden="true"
      className="grid size-7 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-ink-on-primary)] shadow-[var(--shadow-sm)]"
    >
      <ArrowLeftRight size={15} strokeWidth={2.4} />
    </span>
  );
}

// Presence once the Room is live, announced for screen readers — the avatar cluster
// carries it visually, so this is a polite live region only (role="status"), making
// join/reconnect flips arriving async over the socket announce instead of passing
// silently. The alone-and-waiting cue is owned by the share surface.
function ReceiverPresence({
  status,
  receiverCount,
}: {
  status?: RoomSocketStatus;
  receiverCount: number;
}) {
  if (status === "disconnected") {
    return (
      <p role="status" className="sr-only">
        Reconnecting…
      </p>
    );
  }

  if (receiverCount === 0) return null;

  return (
    <p role="status" className="sr-only">
      {receiverCount === 1 ? "Receiver connected" : `${receiverCount} Receivers connected`}
    </p>
  );
}
