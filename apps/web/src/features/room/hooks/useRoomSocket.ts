import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { createRoomSocket } from "~/features/room/services/room-socket.service";
import { resolveApiOrigin } from "~/shared/utils/api-origin";
import {
  RoomEvent,
  type RoomCloseAck,
  type RoomPresencePayload,
} from "~/features/room/constants/room-events";
import {
  TransferEvent,
  type TransferDeliveredPayload,
  type TransferProgressPayload,
  type TransferTextPayload,
} from "~/features/room/constants/transfer";

// "lost" is terminal: socket.io gave up reconnecting. "disconnected" is the
// recoverable in-between the UI reads as "Reconnecting…".
export type RoomSocketStatus = "idle" | "connecting" | "connected" | "disconnected" | "lost";

export interface RoomSocketState {
  status: RoomSocketStatus;
  receiverCount: number;
  /** Live Transfers in this Room, ordered by first progress event. */
  transfers: TransferProgressPayload[];
  /** Text Snippets / Links received over the socket, in arrival order. */
  texts: TransferTextPayload[];
  /** transferIds a Receiver has finished downloading. Drives the delivered
   *  states (Sender row, Receiver row) and the one-shot Delivery flash. */
  delivered: ReadonlySet<string>;
  /** True once the server broadcasts room:closed — the Room was torn down and
   *  this Participant is being kicked. Terminal: the UI shows a closed notice. */
  closed: boolean;
}

export interface RoomSocket extends RoomSocketState {
  /** Sends a Text Snippet / Link to the Room; a no-op until the socket is live. */
  sendText: (text: string) => void;
  /** Sender-only: closes the Room, kicking every Participant. Resolves with the
   *  server's ack (or an error when there's no live socket). */
  closeRoom: () => Promise<RoomCloseAck>;
}

const initialState: RoomSocketState = {
  status: "idle",
  receiverCount: 0,
  transfers: [],
  texts: [],
  delivered: new Set(),
  closed: false,
};

// Default factory: the real socket. Tests pass a fake to drive events without a
// server, keeping the hook decoupled from socket.io-client.
export type SocketFactory = (token: string) => Socket;

const defaultFactory: SocketFactory = (token) =>
  createRoomSocket(resolveApiOrigin(import.meta.env), token);

// How long to wait for the server's close ack before giving up and surfacing an
// error, so a dropped request never leaves the delete button spinning.
const CLOSE_ACK_TIMEOUT_MS = 5000;

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

    // Append each Text/Link once. A resend from the server carries a new
    // transferId; a duplicate id (retransmit) is ignored.
    const onText = (payload: TransferTextPayload) => {
      if (typeof payload?.transferId !== "string") return;
      setState((prev) =>
        prev.texts.some((t) => t.transferId === payload.transferId)
          ? prev
          : { ...prev, texts: [...prev.texts, payload] },
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
    socket.on(TransferEvent.Progress, onProgress);
    socket.on(TransferEvent.Text, onText);
    socket.on(TransferEvent.Delivered, onDelivered);

    return () => {
      socket.io?.off?.("reconnect_failed", onLost);
      socket.off();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, factory]);

  const sendText = useCallback((text: string) => {
    socketRef.current?.emit(TransferEvent.SendText, { text });
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

  return { ...state, sendText, closeRoom };
}
