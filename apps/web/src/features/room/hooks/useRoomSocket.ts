import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { createRoomSocket } from "~/features/room/services/room-socket.service";
import { resolveApiOrigin } from "~/shared/utils/api-origin";
import {
  RoomEvent,
  type RoomCloseAck,
  type RoomPresencePayload,
  type RoomRenameAck,
  type RoomTypingPayload,
} from "~/features/room/constants/room-events";
import {
  TransferEvent,
  type ParticipantIdentity,
  type SendTextAck,
  type TransferAuthor,
  type TransferDeliveredPayload,
  type TransferProgressPayload,
  type TransferTextPayload,
} from "~/features/room/constants/transfer";

// A Text Snippet / Link in the live stream, tagged relative to this client:
// `mine` marks the sender's own optimistic echo (rendered as outgoing, author
// null — it's "you"); incoming payloads from other Participants carry their
// author.
export interface RoomText {
  transferId: string;
  payloadType: TransferTextPayload["payloadType"];
  content: string;
  author: TransferAuthor | null;
  mine: boolean;
}

// "lost" is terminal: socket.io gave up reconnecting. "disconnected" is the
// recoverable in-between the UI reads as "Reconnecting…".
export type RoomSocketStatus = "idle" | "connecting" | "connected" | "disconnected" | "lost";

export interface RoomSocketState {
  status: RoomSocketStatus;
  receiverCount: number;
  /** Live Transfers in this Room, ordered by first progress event. */
  transfers: TransferProgressPayload[];
  /** Text Snippets / Links in the live stream — this client's own echoed sends
   *  and other Participants' incoming ones — in arrival order. */
  texts: RoomText[];
  /** transferIds a Receiver has finished downloading. Drives the delivered
   *  states (Sender row, Receiver row) and the one-shot Delivery flash. */
  delivered: ReadonlySet<string>;
  /** True once the server broadcasts room:closed — the Room was torn down and
   *  this Participant is being kicked. Terminal: the UI shows a closed notice. */
  closed: boolean;
  /** This client's own identity (colour + name), once the server assigns it on
   *  join. Undefined until connected. */
  self: ParticipantIdentity | undefined;
  /** Latest identity per identity key, from rename broadcasts. Re-labels the
   *  messages already attributed to a peer who renamed. */
  identities: ReadonlyMap<string, ParticipantIdentity>;
  /** Peers currently composing, keyed by identity key — drives the ephemeral
   *  typing indicator. A peer drops out on their stop signal, when their message
   *  lands, or after a safety timeout if the stop is lost. */
  typing: ReadonlyMap<string, ParticipantIdentity>;
}

export interface RoomSocket extends RoomSocketState {
  /** Sends a Text Snippet / Link to the Room and resolves with the server ack.
   *  On success the classified message is echoed into `texts` as the sender's
   *  own (their send is never broadcast back). Resolves an error with no live
   *  socket, so the caller never hangs. */
  sendText: (text: string) => Promise<SendTextAck>;
  /** Sender-only: closes the Room, kicking every Participant. Resolves with the
   *  server's ack (or an error when there's no live socket). */
  closeRoom: () => Promise<RoomCloseAck>;
  /** Edits this client's display name. On success the server broadcasts the new
   *  identity to the Room; resolves with the ack (or an error with no socket). */
  rename: (name: string) => Promise<RoomRenameAck>;
  /** Signals this client's composing state to the Room. Ephemeral and
   *  fire-and-forget — no ack, no persistence; a no-op without a live socket. */
  setTyping: (typing: boolean) => void;
}

const initialState: RoomSocketState = {
  status: "idle",
  receiverCount: 0,
  transfers: [],
  texts: [],
  delivered: new Set(),
  closed: false,
  self: undefined,
  identities: new Map(),
  typing: new Map(),
};

// Default factory: the real socket. Tests pass a fake to drive events without a
// server, keeping the hook decoupled from socket.io-client.
export type SocketFactory = (token: string) => Socket;

const defaultFactory: SocketFactory = (token) =>
  createRoomSocket(resolveApiOrigin(import.meta.env), token);

// How long to wait for the server's close ack before giving up and surfacing an
// error, so a dropped request never leaves the delete button spinning.
const CLOSE_ACK_TIMEOUT_MS = 5000;

// Same backstop for a Text/Link send: a dropped ack surfaces an error instead of
// leaving the composer's send promise pending forever.
const SEND_ACK_TIMEOUT_MS = 5000;

// How long a peer's typing indicator lingers without a refresh before it clears
// itself. The composer re-emits `typing: true` on a heartbeat well inside this
// window, so a still-typing peer stays lit; a lost stop signal can't strand the
// indicator on forever.
const TYPING_SAFETY_TIMEOUT_MS = 6000;

/**
 * Subscribes to live Room activity — Receiver presence, file progress, and
 * incoming Text/Link payloads — and exposes sendText for the Sender to push one.
 * No token (session not resolved, or SSR) means no socket: returns an idle state
 * so callers can render the same "waiting" markup on both passes.
 */
export function useRoomSocket(
  token: string | undefined,
  factory: SocketFactory = defaultFactory,
): RoomSocket {
  const [state, setState] = useState<RoomSocketState>(initialState);
  const socketRef = useRef<Socket | null>(null);
  // Per-peer safety timers that drop a stale typing indicator if its stop signal
  // never arrives. Held in a ref so they survive re-renders and can all be swept
  // on teardown / token change.
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!token) {
      setState(initialState);
      return;
    }

    setState({ ...initialState, status: "connecting" });
    const socket = factory(token);
    socketRef.current = socket;

    // Trust nothing off the wire: a malformed or missing count (protocol drift, a
    // bad server build) coerces to 0 rather than rendering "NaN Receivers".
    const onCount = (payload: RoomPresencePayload) => {
      const next = Number(payload?.receiverCount);
      const count = Number.isFinite(next) && next > 0 ? Math.trunc(next) : 0;
      setState((prev) => ({ ...prev, receiverCount: count }));
    };

    // Upsert by transferId: progress events replace the entry in place, a new
    // Transfer appends. Malformed payloads (no string id) are dropped whole.
    const onProgress = (payload: TransferProgressPayload) => {
      if (typeof payload?.transferId !== "string") return;
      setState((prev) => {
        const at = prev.transfers.findIndex((t) => t.transferId === payload.transferId);
        const transfers =
          at === -1
            ? [...prev.transfers, payload]
            : prev.transfers.map((t, i) => (i === at ? payload : t));
        return { ...prev, transfers };
      });
    };

    // Append each incoming Text/Link once, tagged as another Participant's. A
    // resend carries a new transferId; a duplicate id (retransmit) is ignored.
    const onText = (payload: TransferTextPayload) => {
      if (typeof payload?.transferId !== "string") return;
      // Their message landed — they've stopped composing, so clear any lingering
      // indicator without waiting for a separate stop signal.
      const authorKey = payload.author?.identity?.key;
      if (typeof authorKey === "string") dropTyping(authorKey);
      setState((prev) =>
        prev.texts.some((t) => t.transferId === payload.transferId)
          ? prev
          : { ...prev, texts: [...prev.texts, { ...payload, mine: false }] },
      );
    };

    // Mark a Transfer delivered once. The server fires this at most once per
    // transfer, but a reconnect could replay it — a Set keeps it idempotent so
    // the flash never re-fires for an id already seen.
    const onDelivered = (payload: TransferDeliveredPayload) => {
      if (typeof payload?.transferId !== "string") return;
      setState((prev) => {
        if (prev.delivered.has(payload.transferId)) return prev;
        return { ...prev, delivered: new Set(prev.delivered).add(payload.transferId) };
      });
    };

    // This client's own identity, assigned on join.
    const onIdentitySelf = (identity: ParticipantIdentity) => {
      if (typeof identity?.key !== "string") return;
      setState((prev) => ({ ...prev, self: identity }));
    };

    // A peer (or this client) renamed. Track the latest identity per key so the
    // stream re-labels every message already attributed to it, and keep `self` in
    // step when the rename is our own.
    const onIdentity = (identity: ParticipantIdentity) => {
      if (typeof identity?.key !== "string") return;
      setState((prev) => {
        const identities = new Map(prev.identities).set(identity.key, identity);
        const self = prev.self?.key === identity.key ? identity : prev.self;
        return { ...prev, identities, self };
      });
    };

    // Drop a peer from the typing set and cancel its safety timer. The single
    // exit point for a stop signal, an arriving message, and the timeout alike.
    const dropTyping = (key: string) => {
      const timer = typingTimers.current.get(key);
      if (timer) {
        clearTimeout(timer);
        typingTimers.current.delete(key);
      }
      setState((prev) => {
        if (!prev.typing.has(key)) return prev;
        const typing = new Map(prev.typing);
        typing.delete(key);
        return { ...prev, typing };
      });
    };

    // A peer's composing state. `true` lights (or refreshes) their indicator and
    // re-arms the safety timer; `false` is the explicit stop. The identity is the
    // server's, so it's trusted for the label.
    const onTypingState = (payload: RoomTypingPayload) => {
      const identity = payload?.identity;
      if (typeof identity?.key !== "string" || typeof payload?.typing !== "boolean") return;
      if (!payload.typing) {
        dropTyping(identity.key);
        return;
      }
      const existing = typingTimers.current.get(identity.key);
      if (existing) clearTimeout(existing);
      typingTimers.current.set(
        identity.key,
        setTimeout(() => dropTyping(identity.key), TYPING_SAFETY_TIMEOUT_MS),
      );
      setState((prev) => ({ ...prev, typing: new Map(prev.typing).set(identity.key, identity) }));
    };

    // The Sender closed the Room. Latch it terminal so the ensuing forced
    // disconnect reads as "Room closed", not "Reconnecting…".
    const onClosed = () => setState((prev) => ({ ...prev, closed: true }));

    const onDown = () => setState((prev) => ({ ...prev, status: "disconnected" }));
    // socket.io exhausted its reconnect budget — the Room won't recover on its own.
    // A later "connect" (manual refresh, network back) still flips it to connected.
    const onLost = () => setState((prev) => ({ ...prev, status: "lost" }));

    socket.on("connect", () => setState((prev) => ({ ...prev, status: "connected" })));
    socket.on("disconnect", onDown);
    // A handshake that never lands (server down, websocket blocked by a proxy, a
    // rejected token) would otherwise sit at "connecting" forever, showing a false
    // "Waiting for Receiver". Treat it as disconnected so the UI reads "Reconnecting…".
    socket.on("connect_error", onDown);
    // Reconnection lifecycle lives on the Manager (socket.io), not the Socket. The
    // optional chain keeps the test fake (a bare emitter, no Manager) working.
    socket.io?.on?.("reconnect_failed", onLost);
    socket.on(RoomEvent.Joined, onCount);
    socket.on(RoomEvent.Left, onCount);
    socket.on(RoomEvent.Closed, onClosed);
    socket.on(RoomEvent.IdentitySelf, onIdentitySelf);
    socket.on(RoomEvent.Identity, onIdentity);
    socket.on(RoomEvent.TypingState, onTypingState);
    socket.on(TransferEvent.Progress, onProgress);
    socket.on(TransferEvent.Text, onText);
    socket.on(TransferEvent.Delivered, onDelivered);

    return () => {
      socket.io?.off?.("reconnect_failed", onLost);
      socket.off();
      socket.disconnect();
      socketRef.current = null;
      // Sweep the per-peer typing timers so a pending one can't fire into an
      // unmounted hook (or a fresh Room after a token change).
      for (const timer of typingTimers.current.values()) clearTimeout(timer);
      typingTimers.current.clear();
    };
  }, [token, factory]);

  const sendText = useCallback((text: string): Promise<SendTextAck> => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return Promise.resolve({ error: "No connection" });
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ack: SendTextAck) => {
        if (settled) return;
        settled = true;
        // Echo the sender's own message into the stream — the server never
        // broadcasts it back, so this is the only place it lands live. Deduped by
        // transferId so a late ack can't double it.
        if ("transferId" in ack) {
          const mine: RoomText = { ...ack, author: null, mine: true };
          setState((prev) =>
            prev.texts.some((t) => t.transferId === mine.transferId)
              ? prev
              : { ...prev, texts: [...prev.texts, mine] },
          );
        }
        resolve(ack);
      };
      const timer = setTimeout(() => finish({ error: "No response" }), SEND_ACK_TIMEOUT_MS);
      socket.emit(TransferEvent.SendText, { text }, (ack: SendTextAck) => {
        clearTimeout(timer);
        finish(ack ?? { error: "No response" });
      });
    });
  }, []);

  const closeRoom = useCallback((): Promise<RoomCloseAck> => {
    const socket = socketRef.current;
    // Require a *connected* socket: on a disconnected/lost one the emit just
    // buffers and its ack never fires, leaving the caller (and the delete button)
    // hanging forever. Fail fast so the UI can recover.
    if (!socket || !socket.connected) return Promise.resolve({ error: "No connection" });
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ack: RoomCloseAck) => {
        if (settled) return;
        settled = true;
        resolve(ack);
      };
      // Backstop the ack: a server that drops mid-request must surface an error,
      // not spin the button indefinitely.
      const timer = setTimeout(() => finish({ error: "No response" }), CLOSE_ACK_TIMEOUT_MS);
      socket.emit(RoomEvent.Close, (ack: RoomCloseAck) => {
        clearTimeout(timer);
        finish(ack ?? { error: "No response" });
      });
    });
  }, []);

  const rename = useCallback((name: string): Promise<RoomRenameAck> => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return Promise.resolve({ error: "No connection" });
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ack: RoomRenameAck) => {
        if (settled) return;
        settled = true;
        // The server also broadcasts the new identity (onIdentity handles it), but
        // apply it here too so the sender's own name updates without waiting for a
        // round-trip through the broadcast.
        if ("identity" in ack) {
          const identity = ack.identity;
          setState((prev) => ({
            ...prev,
            self: identity,
            identities: new Map(prev.identities).set(identity.key, identity),
          }));
        }
        resolve(ack);
      };
      const timer = setTimeout(() => finish({ error: "No response" }), SEND_ACK_TIMEOUT_MS);
      socket.emit(RoomEvent.Rename, { name }, (ack: RoomRenameAck) => {
        clearTimeout(timer);
        finish(ack ?? { error: "No response" });
      });
    });
  }, []);

  const setTyping = useCallback((typing: boolean): void => {
    const socket = socketRef.current;
    // Fire-and-forget: the signal is ephemeral, so a dropped emit just means one
    // missed frame — no ack, and nothing to recover. A closed stop is backstopped
    // by each peer's safety timeout anyway.
    if (!socket || !socket.connected) return;
    socket.emit(RoomEvent.Typing, { typing });
  }, []);

  return { ...state, sendText, closeRoom, rename, setTyping };
}
