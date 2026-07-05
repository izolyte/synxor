export const CHUNK_SIZE_BYTES = 256 * 1024;

// Mirrors the API's MAX_TEXT_PAYLOAD_CHARS — the Sender's input is capped here so
// an over-limit paste is rejected inline before it ever reaches the socket.
export const MAX_TEXT_PAYLOAD_CHARS = 100_000;

export const TransferEvent = {
  Progress: "transfer:progress",
  // Sender → server: submit a Text Snippet / Link.
  SendText: "transfer:text:send",
  // Server → Room: the classified payload for the other participants.
  Text: "transfer:text",
} as const;

export interface TransferProgressPayload {
  transferId: string;
  fileName: string;
  fileSizeBytes: number;
  receivedChunks: number;
  totalChunks: number;
  complete: boolean;
}

export type TextPayloadType = "TEXT_SNIPPET" | "LINK";

export interface TransferTextPayload {
  transferId: string;
  payloadType: TextPayloadType;
  content: string;
}
