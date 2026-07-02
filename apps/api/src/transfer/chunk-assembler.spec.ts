import { CHUNK_SIZE_BYTES } from '../domain/transfer/chunking';
import { FakeObjectStorage } from '../domain/storage/object-storage.fake';
import { chunkObjectKey, fileObjectKey } from '../domain/transfer/storage-key';
import type { UploadSession } from '../domain/transfer/upload-session';
import { ChunkAssembler } from './chunk-assembler';

const roomId = 'room-1';
const transferId = 'transfer-1';

function session(totalChunks: number, fileSizeBytes: number): UploadSession {
  return {
    transferId,
    roomId,
    fileName: 'video.mp4',
    fileSizeBytes,
    mimeType: 'video/mp4',
    totalChunks,
    receivedChunks: new Set(Array.from({ length: totalChunks }, (_, i) => i)),
  };
}

describe('ChunkAssembler', () => {
  let storage: FakeObjectStorage;
  let assembler: ChunkAssembler;

  beforeEach(() => {
    storage = new FakeObjectStorage();
    assembler = new ChunkAssembler(storage);
  });

  it('concatenates chunk objects in index order into the final object', async () => {
    const first = Buffer.alloc(CHUNK_SIZE_BYTES, 1);
    const tail = Buffer.alloc(100, 2);
    storage.objects.set(chunkObjectKey(roomId, transferId, 0), first);
    storage.objects.set(chunkObjectKey(roomId, transferId, 1), tail);

    await assembler.assemble(session(2, CHUNK_SIZE_BYTES + 100));

    expect(storage.objects.get(fileObjectKey(roomId, transferId))).toEqual(
      Buffer.concat([first, tail]),
    );
  });

  it('removes the chunk objects after the final object is written', async () => {
    storage.objects.set(chunkObjectKey(roomId, transferId, 0), Buffer.alloc(10, 3));

    await assembler.assemble(session(1, 10));

    expect(storage.objects.has(chunkObjectKey(roomId, transferId, 0))).toBe(false);
  });

  it('leaves chunk objects in place when writing the final object fails', async () => {
    class ExplodingStorage extends FakeObjectStorage {
      putObject(): Promise<void> {
        return Promise.reject(new Error('minio down'));
      }
    }
    const exploding = new ExplodingStorage();
    exploding.objects.set(chunkObjectKey(roomId, transferId, 0), Buffer.alloc(10, 3));

    await expect(new ChunkAssembler(exploding).assemble(session(1, 10))).rejects.toThrow(
      'minio down',
    );
    expect(exploding.objects.has(chunkObjectKey(roomId, transferId, 0))).toBe(true);
  });
});
