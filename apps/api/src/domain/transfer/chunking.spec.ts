import { CHUNK_SIZE_BYTES, chunkCountFor, validateChunk } from './chunking';
import {
  ChunkOutOfRangeError,
  ChunkSizeMismatchError,
  ChunkTotalMismatchError,
} from './transfer.errors';

describe('chunkCountFor', () => {
  it('rounds up to whole chunks', () => {
    expect(chunkCountFor(1)).toBe(1);
    expect(chunkCountFor(CHUNK_SIZE_BYTES)).toBe(1);
    expect(chunkCountFor(CHUNK_SIZE_BYTES + 1)).toBe(2);
    expect(chunkCountFor(10 * 1024 * 1024)).toBe(40);
  });

  it('rejects a zero or negative size', () => {
    expect(() => chunkCountFor(0)).toThrow(RangeError);
    expect(() => chunkCountFor(-1)).toThrow(RangeError);
  });
});

describe('validateChunk', () => {
  const fileSizeBytes = CHUNK_SIZE_BYTES + 100; // 2 chunks: full + 100-byte tail

  it('accepts a full-size interior chunk and the short tail chunk', () => {
    expect(() =>
      validateChunk({ fileSizeBytes, totalChunks: 2, chunkIndex: 0, byteLength: CHUNK_SIZE_BYTES }),
    ).not.toThrow();
    expect(() =>
      validateChunk({ fileSizeBytes, totalChunks: 2, chunkIndex: 1, byteLength: 100 }),
    ).not.toThrow();
  });

  it('rejects a totalChunks that disagrees with the file size', () => {
    expect(() =>
      validateChunk({ fileSizeBytes, totalChunks: 3, chunkIndex: 0, byteLength: CHUNK_SIZE_BYTES }),
    ).toThrow(ChunkTotalMismatchError);
  });

  it('rejects an index outside [0, totalChunks)', () => {
    expect(() =>
      validateChunk({ fileSizeBytes, totalChunks: 2, chunkIndex: 2, byteLength: 100 }),
    ).toThrow(ChunkOutOfRangeError);
    expect(() =>
      validateChunk({ fileSizeBytes, totalChunks: 2, chunkIndex: -1, byteLength: 100 }),
    ).toThrow(ChunkOutOfRangeError);
  });

  it('rejects a chunk whose byte length does not match its position', () => {
    // interior chunk must be exactly CHUNK_SIZE_BYTES
    expect(() =>
      validateChunk({ fileSizeBytes, totalChunks: 2, chunkIndex: 0, byteLength: 100 }),
    ).toThrow(ChunkSizeMismatchError);
    // tail chunk must be exactly the remainder
    expect(() =>
      validateChunk({ fileSizeBytes, totalChunks: 2, chunkIndex: 1, byteLength: 101 }),
    ).toThrow(ChunkSizeMismatchError);
  });
});
