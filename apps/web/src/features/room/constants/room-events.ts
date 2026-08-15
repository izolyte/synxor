// Mirror of the API's room/room-events.ts. The api package exposes types only
// (no server runtime in the web bundle), so these client-side event names are
// duplicated here intentionally; keep both in sync.
import type { ParticipantIdentity } from "~/features/room/constants/transfer";

export const RoomEvent = {
  Joined: "room:joined",
  Left: "room:left",
  // Server → Room: the live roster of present Participants (deduped by identity),
  // plus which identity just joined or left. Drives the header cluster + count and
  // the ephemeral join/leave notice.
  Roster: "room:roster",
  // Client → server: the Sender tears the Room down.
  Close: "room:close",
  // Server → Room: the Room was closed; the Participant is about to be kicked.
  Closed: "room:closed",
  // Server → this socket: its own identity (colour + name) on join.
  IdentitySelf: "room:identity:self",
  // Server → Room: an identity's current descriptor, sent on a rename so peers
  // re-label the messages already attributed to it.
  Identity: "room:identity",
  // Client → server: edit this Participant's display name.
  Rename: "room:rename",
  // Client → server: this Participant started/stopped composing. Ephemeral — the
  // server only relays it, never persists it.
  Typing: "room:typing",
  // Server → Room: a peer's live composing state, attributed to their identity.
  TypingState: "room:typing:state",
} as const;

export interface RoomPresencePayload {
  receiverCount: number;
}

// A peer's composing state, attributed to their identity. `typing` false is the
// explicit stop; a lost stop is backstopped by a client-side timeout.
export interface RoomTypingPayload {
  identity: ParticipantIdentity;
  typing: boolean;
}

// The live presence roster plus what just changed. `roster` is one entry per
// present identity; exactly one of `joined` / `left` is set when a Participant's
// presence toggled (absent on the plain re-sync a late arrival receives).
export interface RoomRosterPayload {
  roster: ParticipantIdentity[];
  joined?: ParticipantIdentity;
  left?: ParticipantIdentity;
}

// Ack the server returns to a close request: success or a reason.
export type RoomCloseAck = { ok: true } | { error: string };

// Ack the server returns to a rename: the resolved identity, or a reason.
export type RoomRenameAck = { identity: ParticipantIdentity } | { error: string };
