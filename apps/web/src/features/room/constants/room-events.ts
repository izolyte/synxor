// Mirror of the API's room/room-events.ts. The api package exposes types only
// (no server runtime in the web bundle), so these client-side event names are
// duplicated here intentionally; keep both in sync.
export const RoomEvent = {
  Joined: "room:joined",
  Left: "room:left",
  // Client → server: the Sender tears the Room down.
  Close: "room:close",
  // Server → Room: the Room was closed; the Participant is about to be kicked.
  Closed: "room:closed",
} as const;

export interface RoomPresencePayload {
  receiverCount: number;
}

// Ack the server returns to a close request: success or a reason.
export type RoomCloseAck = { ok: true } | { error: string };
