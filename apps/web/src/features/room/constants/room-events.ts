// Mirror of the API's room/room-events.ts. The api package exposes types only
// (no server runtime in the web bundle), so these client-side event names are
// duplicated here intentionally; keep both in sync.
import type { ParticipantIdentity } from "~/features/room/constants/transfer";

export const RoomEvent = {
  Joined: "room:joined",
  Left: "room:left",
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
} as const;

export interface RoomPresencePayload {
  receiverCount: number;
}

// Ack the server returns to a close request: success or a reason.
export type RoomCloseAck = { ok: true } | { error: string };

// Ack the server returns to a rename: the resolved identity, or a reason.
export type RoomRenameAck = { identity: ParticipantIdentity } | { error: string };
