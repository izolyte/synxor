export const CHUNK_SIZE_BYTES = 256 * 1024;

// Stall thresholds (docs/design/15-edge-cases.md). No chunk movement for
// STALL_SLOW_MS reads as a slow connection, not a failure. A Transfer parked at
// or above ALMOST_DONE_PERCENT is a hair from done, so it gets the longer
// STALL_ALMOST_MS window and the gentler "Almost done…" copy instead.
export const STALL_SLOW_MS = 10_000;
export const STALL_ALMOST_MS = 30_000;
export const ALMOST_DONE_PERCENT = 99;

// Mirrors the API's MAX_TEXT_PAYLOAD_CHARS — the Sender's input is capped here so
// an over-limit paste is rejected inline before it ever reaches the socket.
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
}

export interface TransferDeliveredPayload {
  transferId: string;
}

export type TextPayloadType = "TEXT_SNIPPET" | "LINK";

export interface TransferTextPayload {
  transferId: string;
  payloadType: TextPayloadType;
  content: string;
}
