export const CHUNK_SIZE_BYTES = 256 * 1024;

// Stall thresholds (docs/design/15-edge-cases.md). No chunk movement for
// STALL_SLOW_MS reads as a slow connection, not a failure. A Transfer parked at
// or above ALMOST_DONE_PERCENT is a hair from done, so it gets the longer
// STALL_ALMOST_MS window and the gentler "Almost done…" copy instead.
export const STALL_SLOW_MS = 10_000;
export const STALL_ALMOST_MS = 30_000;
export const ALMOST_DONE_PERCENT = 99;

// Mirrors the API's MAX_TEXT_PAYLOAD_CHARS — the composer's input is capped here
// so an over-limit paste is rejected inline before it ever reaches the socket.
export const MAX_TEXT_PAYLOAD_CHARS = 100_000;

export const TransferEvent = {
  Progress: "transfer:progress",
  // Sender → server: submit a Text Snippet / Link.
  SendText: "transfer:text:send",
  // Server → Room: the classified payload for the other participants.
  Text: "transfer:text",
  // Server → Room: a Receiver finished downloading a Transfer. Fires at most once
  // per transfer. Mirrors the API's TransferEvent.Delivered (apps/api's
  // transfer-events.ts) — no shared package, so keep the two in sync by hand.
  Delivered: "transfer:delivered",
} as const;

export interface TransferProgressPayload {
  transferId: string;
  fileName: string;
  fileSizeBytes: number;
  receivedChunks: number;
  totalChunks: number;
  complete: boolean;
  // Who is uploading, so the stream attributes a live file from its first progress
  // event and the uploader's own client right-aligns it. Null when the token has
  // no resolvable identity (never joined over the socket).
  author: TransferAuthor | null;
}

export interface TransferDeliveredPayload {
  transferId: string;
}

export type TextPayloadType = "TEXT_SNIPPET" | "LINK";

// Who sent a Transfer. `role` still drives the file-attribution fallback; the
// stream now labels messages by the author's stable identity.
export type TransferAuthorRole = "SENDER" | "RECEIVER";

// A peer's shared display identity. Mirror of the API's ParticipantIdentity
// (apps/api's domain/participant/participant-identity.ts) — assigned server-side,
// so `colorKey` maps to a --identity-<colorKey> token the FE owns. `key` is the
// stable id used to re-label a peer's messages after they rename.
export interface ParticipantIdentity {
  key: string;
  colorKey: string;
  name: string;
}

export interface TransferAuthor {
  role: TransferAuthorRole;
  // Absent only for a live file row before the Sender's identity is known; the
  // bubble falls back to the bare role then.
  identity?: ParticipantIdentity | null;
}

export interface TransferTextPayload {
  transferId: string;
  payloadType: TextPayloadType;
  content: string;
  author: TransferAuthor;
}

// Ack the server returns to the author of a Text Snippet / Link: the persisted id
// plus the server's classification, so the sender renders the same row its peers
// receive (its own send is never broadcast back). Or a reason on failure.
export type SendTextAck =
  | { transferId: string; payloadType: TextPayloadType; content: string }
  | { error: string };
