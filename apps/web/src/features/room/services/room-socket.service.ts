import { io, type Socket } from "socket.io-client";
import { MAX_RECONNECT_ATTEMPTS } from "~/features/room/constants/connection";

// Opens a Room Socket authenticated by the Room Token. The token rides the
// handshake auth (not a query string), so it never lands in server access logs.
// Capped reconnect attempts so a dead network eventually surfaces "Lost
// connection" instead of retrying forever behind a silent "Reconnecting…".
export function createRoomSocket(url: string, token: string): Socket {
  return io(url, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
  });
}
