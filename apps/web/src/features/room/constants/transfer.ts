export const CHUNK_SIZE_BYTES = 256 * 1024;

export const TransferEvent = {
  Progress: "transfer:progress",
} as const;

export interface TransferProgressPayload {
  transferId: string;
  fileName: string;
  fileSizeBytes: number;
  receivedChunks: number;
  totalChunks: number;
  complete: boolean;
}
