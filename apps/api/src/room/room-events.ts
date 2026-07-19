// Server → client room presence events. The Sender subscribes to these to track
// Receivers in real time. Names and payload shapes are the FE↔BE contract; keep
// them here so neither side hard-codes a literal.
export const RoomEvent = {
  Joined: 'room:joined',
  Left: 'room:left',
  // Client → server: the Sender tears the Room down.
  Close: 'room:close',
  // Server → Room: the Room was closed; every Participant is about to be kicked.
  Closed: 'room:closed',
} as const;
export type RoomEvent = (typeof RoomEvent)[keyof typeof RoomEvent];

export interface RoomPresencePayload {
  receiverCount: number;
}

// Socket ack for a close request: success, or a reason the caller can surface.
export type RoomCloseAck = { ok: true } | { error: string };
