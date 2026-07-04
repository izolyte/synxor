import {
  ChunkOutOfRangeError,
  ChunkSizeMismatchError,
  ChunkTotalMismatchError,
} from './transfer.errors';

export const CHUNK_SIZE_BYTES = 256 * 1024;

export function chunkCountFor(fileSizeBytes: number): number {
  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    throw new RangeError(`fileSizeBytes must be positive, got ${fileSizeBytes}`);
  }
  return Math.ceil(fileSizeBytes / CHUNK_SIZE_BYTES);
}

export interface ChunkShape {
  fileSizeBytes: number;
  totalChunks: number;
  chunkIndex: number;
  byteLength: number;
}

// Every chunk's size is fully determined by its position, so a corrupted or
// truncated upload is rejected before anything touches storage.
export function validateChunk({
  fileSizeBytes,
  totalChunks,
  chunkIndex,
  byteLength,
}: ChunkShape): void {
  const expectedTotal = chunkCountFor(fileSizeBytes);
  if (totalChunks !== expectedTotal) {
    throw new ChunkTotalMismatchError(totalChunks, expectedTotal);
  }
  if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= totalChunks) {
    throw new ChunkOutOfRangeError(chunkIndex, totalChunks);
  }
  const isTail = chunkIndex === totalChunks - 1;
  const expectedLength = isTail ? fileSizeBytes - chunkIndex * CHUNK_SIZE_BYTES : CHUNK_SIZE_BYTES;
  if (byteLength !== expectedLength) {
    throw new ChunkSizeMismatchError(chunkIndex, byteLength, expectedLength);
  }
}
