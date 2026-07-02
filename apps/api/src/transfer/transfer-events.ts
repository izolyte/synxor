// Server → client transfer events. Same contract-in-one-place rule as
// room-events.ts: FE and BE both import these names, nobody hard-codes a literal.
export const TransferEvent = {
  Progress: 'transfer:progress',
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
