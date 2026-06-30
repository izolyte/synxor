// Server → client room presence events. The Sender subscribes to these to track
// Receivers in real time. Names and payload shapes are the FE↔BE contract; keep
// them here so neither side hard-codes a literal.
export const RoomEvent = {
  Joined: 'room:joined',
  Left: 'room:left',
} as const;
export type RoomEvent = (typeof RoomEvent)[keyof typeof RoomEvent];

export interface RoomPresencePayload {
  receiverCount: number;
}
