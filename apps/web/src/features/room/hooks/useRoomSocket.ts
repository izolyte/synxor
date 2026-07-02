import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  createRoomSocket,
  resolveSocketUrl,
} from "~/features/room/services/room-socket.service";
import { RoomEvent, type RoomPresencePayload } from "~/features/room/constants/room-events";
import { TransferEvent, type TransferProgressPayload } from "~/features/room/constants/transfer";

export type RoomSocketStatus = "idle" | "connecting" | "connected" | "disconnected";

export interface RoomSocketState {
  status: RoomSocketStatus;
  receiverCount: number;
  /** Live Transfers in this Room, ordered by first progress event. */
  transfers: TransferProgressPayload[];
}

// Default factory: the real socket. Tests pass a fake to drive events without a
// server, keeping the hook decoupled from socket.io-client.
type SocketFactory = (token: string) => Socket;

const defaultFactory: SocketFactory = (token) =>
  createRoomSocket(resolveSocketUrl(import.meta.env), token);

/**
 * Subscribes the Sender to live Receiver presence for the current Room. Connects
 * with the Room Token, then tracks the receiver count from room:joined / room:left.
 * No token (session not resolved, or SSR) means no socket — returns an idle state
 * with count 0, so callers can render the same "waiting" markup on both passes.
 */
export function useRoomSocket(
  token: string | undefined,
  factory: SocketFactory = defaultFactory,
): RoomSocketState {
  const [state, setState] = useState<RoomSocketState>({
    status: "idle",
    receiverCount: 0,
    transfers: [],
  });

  useEffect(() => {
    if (!token) {
      setState({ status: "idle", receiverCount: 0, transfers: [] });
      return;
    }

    setState({ status: "connecting", receiverCount: 0, transfers: [] });
    const socket = factory(token);

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

    const onDown = () => setState((prev) => ({ ...prev, status: "disconnected" }));

    socket.on("connect", () => setState((prev) => ({ ...prev, status: "connected" })));
    socket.on("disconnect", onDown);
    // A handshake that never lands (server down, websocket blocked by a proxy, a
    // rejected token) would otherwise sit at "connecting" forever, showing a false
    // "Waiting for Receiver". Treat it as disconnected so the UI reads "Reconnecting…".
    socket.on("connect_error", onDown);
    socket.on(RoomEvent.Joined, onCount);
    socket.on(RoomEvent.Left, onCount);
    socket.on(TransferEvent.Progress, onProgress);

    return () => {
      socket.off();
      socket.disconnect();
    };
  }, [token, factory]);

  return state;
}
