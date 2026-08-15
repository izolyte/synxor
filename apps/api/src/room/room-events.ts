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
  // Client → server: this Participant started/stopped composing. Ephemeral — a
  // pure relay, never persisted or logged.
  Typing: 'room:typing',
  // Server → Room: a peer's live composing state, attributed to their identity,
  // so the others can show (or clear) a typing indicator.
  TypingState: 'room:typing:state',
} as const;
export type RoomEvent = (typeof RoomEvent)[keyof typeof RoomEvent];

export interface RoomPresencePayload {
  receiverCount: number;
}

// A peer's composing state, fanned out to the rest of the Room. `typing` false is
// the explicit stop (on send or idle); the identity attributes the indicator.
export interface RoomTypingPayload {
  identity: ParticipantIdentity;
  typing: boolean;
}

// Socket ack for a close request: success, or a reason the caller can surface.
export type RoomCloseAck = { ok: true } | { error: string };

// Socket ack for a rename: the resolved identity (edited or reverted to auto), or
// a reason the caller can surface.
export type RoomRenameAck = { identity: ParticipantIdentity } | { error: string };
