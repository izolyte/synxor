import type { ParticipantIdentity } from '../domain/participant/participant-identity';

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
  // Server → the joining socket: its own identity (colour + name), so the client
  // can show "you are …" and offer a rename.
  IdentitySelf: 'room:identity:self',
  // Server → Room: an identity's current descriptor. Sent on a rename so peers
  // update every message already attributed to that identity.
  Identity: 'room:identity',
  // Client → server: edit this Participant's display name.
  Rename: 'room:rename',
} as const;
export type RoomEvent = (typeof RoomEvent)[keyof typeof RoomEvent];

export interface RoomPresencePayload {
  receiverCount: number;
}

// Socket ack for a close request: success, or a reason the caller can surface.
export type RoomCloseAck = { ok: true } | { error: string };

// Socket ack for a rename: the resolved identity (edited or reverted to auto), or
// a reason the caller can surface.
export type RoomRenameAck = { identity: ParticipantIdentity } | { error: string };
