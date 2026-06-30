// Mirror of the API's room/room-events.ts. The api package exposes types only
// (no server runtime in the web bundle), so these client-side event names are
// duplicated here intentionally; keep both in sync.
export const RoomEvent = {
  Joined: "room:joined",
  Left: "room:left",
} as const;

export interface RoomPresencePayload {
  receiverCount: number;
}
