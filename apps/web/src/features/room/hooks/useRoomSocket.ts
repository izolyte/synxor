import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  createRoomSocket,
  resolveSocketUrl,
} from "~/features/room/services/room-socket.service";
import { RoomEvent, type RoomPresencePayload } from "~/features/room/constants/room-events";

export type RoomSocketStatus = "idle" | "connecting" | "connected" | "disconnected";

export interface RoomSocketState {
  status: RoomSocketStatus;
  receiverCount: number;
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
  const [state, setState] = useState<RoomSocketState>({ status: "idle", receiverCount: 0 });

  useEffect(() => {
    if (!token) {
      setState({ status: "idle", receiverCount: 0 });
      return;
    }

    setState({ status: "connecting", receiverCount: 0 });
    const socket = factory(token);

    const onCount = (payload: RoomPresencePayload) =>
      setState((prev) => ({ ...prev, receiverCount: payload.receiverCount }));

    socket.on("connect", () => setState((prev) => ({ ...prev, status: "connected" })));
    socket.on("disconnect", () => setState((prev) => ({ ...prev, status: "disconnected" })));
    socket.on(RoomEvent.Joined, onCount);
    socket.on(RoomEvent.Left, onCount);

    return () => {
      socket.off();
      socket.disconnect();
    };
  }, [token, factory]);

  return state;
}
