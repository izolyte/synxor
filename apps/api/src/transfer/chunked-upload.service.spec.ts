import { CHUNK_SIZE_BYTES } from '../domain/transfer/chunking';
import {
  ConcurrentTransferLimitError,
  FileTooLargeError,
  UploadRoomMismatchError,
  UploadSessionNotFoundError,
} from '../domain/transfer/transfer.errors';
import { MAX_CONCURRENT_TRANSFERS_PER_ROOM } from '../domain/transfer/upload-session';
import { FakeObjectStorage } from '../domain/storage/object-storage.fake';
import { FakeTransferRepository } from '../domain/transfer/transfer.repository.fake';
import { InMemoryUploadSessionStore } from '../infrastructure/upload-session/in-memory-upload-session.store';
import { chunkObjectKey, fileObjectKey } from '../domain/transfer/storage-key';
import { ChunkedUploadService, type AcceptChunkInput } from './chunked-upload.service';
import { TransferEvent } from './transfer-events';
import type { RoomBroadcaster } from '../room/room-broadcaster';

class FakeBroadcaster implements RoomBroadcaster {
  readonly emitted: Array<{ roomId: string; event: string; payload: unknown }> = [];
  emitToRoom(roomId: string, event: string, payload: unknown): void {
    this.emitted.push({ roomId, event, payload });
  }
}

describe('ChunkedUploadService', () => {
  let storage: FakeObjectStorage;
  let transfers: FakeTransferRepository;
  let sessions: InMemoryUploadSessionStore;
  let broadcaster: FakeBroadcaster;
  let service: ChunkedUploadService;

  const roomId = 'room-1';

  beforeEach(() => {
    storage = new FakeObjectStorage();
    transfers = new FakeTransferRepository();
    sessions = new InMemoryUploadSessionStore();
    broadcaster = new FakeBroadcaster();
    service = new ChunkedUploadService(transfers, storage, sessions, broadcaster, {
      maxFileSizeBytes: 10 * CHUNK_SIZE_BYTES,
    });
  });

  function firstChunkInput(overrides: Partial<AcceptChunkInput> = {}): AcceptChunkInput {
    const chunk = Buffer.alloc(CHUNK_SIZE_BYTES, 1);
    return {
      roomId,
      chunkIndex: 0,
      totalChunks: 2,
      fileName: 'video.mp4',
      fileSizeBytes: CHUNK_SIZE_BYTES + 100,
      mimeType: 'video/mp4',
      chunk,
      ...overrides,
    };
  }

  it('creates the Transfer + FilePayload rows and a session on the first chunk', async () => {
    const result = await service.acceptChunk(firstChunkInput());

    expect(result.complete).toBe(false);
    expect(result.receivedChunks).toBe(1);

    const transfer = await transfers.findById(result.transferId);
    expect(transfer).toMatchObject({ roomId, payloadType: 'FILE' });

    const payload = await transfers.findFilePayloadByTransferId(result.transferId);
    expect(payload).toMatchObject({
      fileName: 'video.mp4',
      storageKey: fileObjectKey(roomId, result.transferId),
    });

    expect(storage.objects.has(chunkObjectKey(roomId, result.transferId, 0))).toBe(true);
  });

  it('assembles the file, removes chunk objects, and closes the session on the last chunk', async () => {
    const { transferId } = await service.acceptChunk(firstChunkInput());
    const tail = Buffer.alloc(100, 2);
    const result = await service.acceptChunk(
      firstChunkInput({ transferId, chunkIndex: 1, chunk: tail }),
    );

    expect(result.complete).toBe(true);

    const assembled = storage.objects.get(fileObjectKey(roomId, transferId));
    expect(assembled?.byteLength).toBe(CHUNK_SIZE_BYTES + 100);
    expect(assembled?.subarray(CHUNK_SIZE_BYTES)).toEqual(tail);

    expect(storage.objects.has(chunkObjectKey(roomId, transferId, 0))).toBe(false);
    expect(storage.objects.has(chunkObjectKey(roomId, transferId, 1))).toBe(false);
    expect(await sessions.get(transferId)).toBeNull();
  });

  it('handles a single-chunk file in one call', async () => {
    const chunk = Buffer.alloc(10, 3);
    const result = await service.acceptChunk(
      firstChunkInput({ totalChunks: 1, fileSizeBytes: 10, chunk }),
    );
    expect(result.complete).toBe(true);
    expect(storage.objects.get(fileObjectKey(roomId, result.transferId))).toEqual(chunk);
  });

  it('broadcasts transfer:progress per chunk', async () => {
    const { transferId } = await service.acceptChunk(firstChunkInput());
    await service.acceptChunk(
      firstChunkInput({ transferId, chunkIndex: 1, chunk: Buffer.alloc(100, 2) }),
    );

    expect(broadcaster.emitted).toHaveLength(2);
    expect(broadcaster.emitted[1]).toMatchObject({
      roomId,
      event: TransferEvent.Progress,
      payload: { transferId, receivedChunks: 2, totalChunks: 2, complete: true },
    });
  });

  it('rejects a file over the size limit', async () => {
    await expect(
      service.acceptChunk(
        firstChunkInput({ fileSizeBytes: 11 * CHUNK_SIZE_BYTES, totalChunks: 11 }),
      ),
    ).rejects.toThrow(FileTooLargeError);
  });

  it('rejects a chunk for an unknown session', async () => {
    await expect(
      service.acceptChunk(
        firstChunkInput({ transferId: 'nope', chunkIndex: 1, chunk: Buffer.alloc(100, 2) }),
      ),
    ).rejects.toThrow(UploadSessionNotFoundError);
  });

  it("rejects a chunk aimed at another Room's Transfer", async () => {
    const { transferId } = await service.acceptChunk(firstChunkInput());
    await expect(
      service.acceptChunk(
        firstChunkInput({
          transferId,
          chunkIndex: 1,
          chunk: Buffer.alloc(100, 2),
          roomId: 'other-room',
        }),
      ),
    ).rejects.toThrow(UploadRoomMismatchError);
  });

  it('enforces the concurrent Transfer limit per Room', async () => {
    for (let i = 0; i < MAX_CONCURRENT_TRANSFERS_PER_ROOM; i++) {
      await service.acceptChunk(firstChunkInput());
    }
    await expect(service.acceptChunk(firstChunkInput())).rejects.toThrow(
      ConcurrentTransferLimitError,
    );
  });

  it('is idempotent for a re-sent chunk', async () => {
    const { transferId } = await service.acceptChunk(firstChunkInput());
    const again = await service.acceptChunk(firstChunkInput({ transferId }));
    expect(again.receivedChunks).toBe(1);
    expect(again.complete).toBe(false);
  });
});
