// Server → client transfer events. Same contract-in-one-place rule as
// room-events.ts: FE and BE both import these names, nobody hard-codes a literal.
export const TransferEvent = {
  Progress: 'transfer:progress',
  Delivered: 'transfer:delivered',
  // Client → server: the Sender submits a Text Snippet / Link to the Room.
  SendText: 'transfer:text:send',
  // Server → Room: the classified payload, delivered to the other participants.
  Text: 'transfer:text',
} as const;
export type TransferEvent = (typeof TransferEvent)[keyof typeof TransferEvent];

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

export interface TransferTextPayload {
  transferId: string;
  payloadType: 'TEXT_SNIPPET' | 'LINK';
  content: string;
}

// Socket ack returned to the Sender: the new transferId on success, or a reason.
export type TransferTextAck = { transferId: string } | { error: string };
