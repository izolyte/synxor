export const CHUNK_SIZE_BYTES = 256 * 1024;

// Transfer Log switches to windowed rendering past this many rows
// (docs/design/15-edge-cases.md). Below it, every row is in the DOM so roving
// focus and find-in-page just work.
export const TRANSFER_LOG_VIRTUALIZE_THRESHOLD = 100;

// Estimated Transfer Row height for the virtualizer (docs/design/10-components.md
// sizes Log rows at ~48px). Rows are near-fixed height, so a flat estimate keeps
// scroll math simple without per-row measurement.
export const TRANSFER_LOG_ROW_HEIGHT = 48;

// Height the Log scroll area caps at before it scrolls, in px. Doubles as the
// virtualizer's seed viewport so the first paint fills a window.
export const TRANSFER_LOG_MAX_HEIGHT = 352;

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
