import { io, type Socket } from "socket.io-client";

// Opens a Room Socket authenticated by the Room Token. The token rides the
// handshake auth (not a query string), so it never lands in server access logs.
export function createRoomSocket(url: string, token: string): Socket {
  return io(url, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
  });
}
