import { io, type Socket } from "socket.io-client";

// The Socket.io server rides the API origin (not /trpc). Mirrors resolveTrpcUrl:
// pure, env passed in, so it's unit-testable without opening a socket.
export function resolveSocketUrl(env: { VITE_API_URL?: string; DEV: boolean }): string {
  const base = env.VITE_API_URL;
  if (!base) {
    if (env.DEV) return "http://localhost:3000";
    throw new Error("VITE_API_URL must be set outside local development");
  }
  // Strip a trailing /trpc (shared env with the tRPC client) and any slashes, so
  // the handshake hits the server root the gateway is mounted on.
  return base.replace(/\/+$/, "").replace(/\/trpc$/, "");
}

// Opens a Room Socket authenticated by the Room Token. The token rides the
// handshake auth (not a query string), so it never lands in server access logs.
export function createRoomSocket(url: string, token: string): Socket {
  return io(url, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
  });
}
