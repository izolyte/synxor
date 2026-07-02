import { Readable } from 'stream';
import { CHUNK_SIZE_BYTES } from '../domain/transfer/chunking';
import { FakeObjectStorage } from '../domain/storage/object-storage.fake';
import { FakeTransferRepository } from '../domain/transfer/transfer.repository.fake';
import { InMemoryUploadSessionStore } from '../infrastructure/upload-session/in-memory-upload-session.store';
import { chunkObjectKey, fileObjectKey } from '../domain/transfer/storage-key';
import {
  UploadRoomMismatchError,
  UploadSessionNotFoundError,
} from '../domain/transfer/transfer.errors';
import { TransferDownloadService } from './transfer-download.service';

async function drain(stream: Readable): Promise<Buffer> {
  const parts: Buffer[] = [];
  for await (const part of stream) parts.push(part as Buffer);
  return Buffer.concat(parts);
}

describe('TransferDownloadService', () => {
  const roomId = 'room-1';
  let storage: FakeObjectStorage;
  let transfers: FakeTransferRepository;
  let sessions: InMemoryUploadSessionStore;
  let service: TransferDownloadService;

  beforeEach(() => {
    storage = new FakeObjectStorage();
    transfers = new FakeTransferRepository();
    sessions = new InMemoryUploadSessionStore();
    service = new TransferDownloadService(transfers, storage, sessions, { pollIntervalMs: 5 });
  });

  async function seedTransfer(fileSizeBytes: number): Promise<string> {
    const transfer = await transfers.create({
      roomId,
      payloadType: 'FILE',
      contentLength: BigInt(fileSizeBytes),
    });
    await transfers.createFilePayload({
      transferId: transfer.id,
      fileName: 'video.mp4',
      fileSizeBytes: BigInt(fileSizeBytes),
      mimeType: 'video/mp4',
      storageKey: fileObjectKey(roomId, transfer.id),
    });
    return transfer.id;
  }

  it('streams the assembled object when no upload session is active', async () => {
    const transferId = await seedTransfer(10);
    const content = Buffer.alloc(10, 7);
    storage.objects.set(fileObjectKey(roomId, transferId), content);

    const download = await service.open(transferId, roomId);
    expect(download.fileName).toBe('video.mp4');
    expect(download.fileSizeBytes).toBe(10);
    expect(download.mimeType).toBe('video/mp4');
    await expect(drain(download.stream)).resolves.toEqual(content);
  });

  it('streams chunks that arrive while the download is open', async () => {
    const fileSizeBytes = CHUNK_SIZE_BYTES + 100;
    const transferId = await seedTransfer(fileSizeBytes);
    await sessions.create({
      transferId,
      roomId,
      fileName: 'video.mp4',
      fileSizeBytes,
      mimeType: 'video/mp4',
      totalChunks: 2,
    });

    const first = Buffer.alloc(CHUNK_SIZE_BYTES, 1);
    storage.objects.set(chunkObjectKey(roomId, transferId, 0), first);
    await sessions.markReceived(transferId, 0);

    const download = await service.open(transferId, roomId);
    const drained = drain(download.stream);

    // tail lands after the download already started
    const tail = Buffer.alloc(100, 2);
    setTimeout(() => {
      storage.objects.set(chunkObjectKey(roomId, transferId, 1), tail);
      void sessions.markReceived(transferId, 1);
    }, 20);

    await expect(drained).resolves.toEqual(Buffer.concat([first, tail]));
  });

  it('switches to the assembled object when the session closes mid-download', async () => {
    const fileSizeBytes = CHUNK_SIZE_BYTES + 100;
    const transferId = await seedTransfer(fileSizeBytes);
    await sessions.create({
      transferId,
      roomId,
      fileName: 'video.mp4',
      fileSizeBytes,
      mimeType: 'video/mp4',
      totalChunks: 2,
    });
    const first = Buffer.alloc(CHUNK_SIZE_BYTES, 1);
    const tail = Buffer.alloc(100, 2);
    storage.objects.set(chunkObjectKey(roomId, transferId, 0), first);
    await sessions.markReceived(transferId, 0);

    const download = await service.open(transferId, roomId);
    const drained = drain(download.stream);

    // assembly completes: final object written, chunks removed, session gone
    setTimeout(() => {
      storage.objects.set(fileObjectKey(roomId, transferId), Buffer.concat([first, tail]));
      storage.objects.delete(chunkObjectKey(roomId, transferId, 0));
      void sessions.delete(transferId);
    }, 20);

    await expect(drained).resolves.toEqual(Buffer.concat([first, tail]));
  });

  it('recovers when assembly deletes a chunk object between the session check and the read', async () => {
    const fileSizeBytes = CHUNK_SIZE_BYTES + 100;
    const transferId = await seedTransfer(fileSizeBytes);
    await sessions.create({
      transferId,
      roomId,
      fileName: 'video.mp4',
      fileSizeBytes,
      mimeType: 'video/mp4',
      totalChunks: 2,
    });
    // Chunk 0 is marked received but its object is already gone — the reader
    // must spin on the race branch until the session closes, then take the
    // assembled object from byte 0.
    await sessions.markReceived(transferId, 0);
    const content = Buffer.concat([Buffer.alloc(CHUNK_SIZE_BYTES, 1), Buffer.alloc(100, 2)]);

    const download = await service.open(transferId, roomId);
    const drained = drain(download.stream);

    setTimeout(() => {
      storage.objects.set(fileObjectKey(roomId, transferId), content);
      void sessions.delete(transferId);
    }, 20);

    await expect(drained).resolves.toEqual(content);
  });

  it('rejects an unknown transfer', async () => {
    await expect(service.open('nope', roomId)).rejects.toThrow(UploadSessionNotFoundError);
  });

  it("rejects another Room's transfer", async () => {
    const transferId = await seedTransfer(10);
    storage.objects.set(fileObjectKey(roomId, transferId), Buffer.alloc(10));
    await expect(service.open(transferId, 'other-room')).rejects.toThrow(UploadRoomMismatchError);
  });
});
