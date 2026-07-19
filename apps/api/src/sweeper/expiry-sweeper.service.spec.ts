import { InMemoryRoomRepository } from '../domain/room/room.repository.fake';
import { FakeTransferRepository } from '../domain/transfer/transfer.repository.fake';
import { FakeObjectStorage } from '../domain/storage/object-storage.fake';
import type { UploadSession, UploadSessionStore } from '../domain/transfer/upload-session';
import { chunkObjectKey, fileObjectKey } from '../domain/transfer/storage-key';
import { HOUR_MS } from '../common/time';
import { ABANDONED_UPLOAD_TTL_MS, ExpirySweeperService } from './expiry-sweeper.service';

// Records deletes and returns whatever sessions the test seeds as abandoned. The
// age filtering lives in the real store (covered by its own spec); here we drive
// the sweeper's reaping behaviour directly.
class StubUploadSessionStore implements UploadSessionStore {
  readonly deleted: string[] = [];
  abandoned: UploadSession[] = [];
  lastOpenedBefore?: Date;

  reserve(): Promise<UploadSession | null> {
    return Promise.reject(new Error('not used'));
  }
  get(): Promise<UploadSession | null> {
    return Promise.resolve(null);
  }
  markReceived(): Promise<UploadSession> {
    return Promise.reject(new Error('not used'));
  }
  delete(transferId: string): Promise<void> {
    this.deleted.push(transferId);
    return Promise.resolve();
  }
  findAbandoned(openedBefore: Date): Promise<UploadSession[]> {
    this.lastOpenedBefore = openedBefore;
    return Promise.resolve(this.abandoned);
  }
}

const HOUR_AGO = new Date(Date.now() - HOUR_MS);
const HOUR_AHEAD = new Date(Date.now() + HOUR_MS);

describe('ExpirySweeperService', () => {
  let rooms: InMemoryRoomRepository;
  let transfers: FakeTransferRepository;
  let storage: FakeObjectStorage;
  let sessions: StubUploadSessionStore;
  let sweeper: ExpirySweeperService;

  beforeEach(() => {
    rooms = new InMemoryRoomRepository();
    transfers = new FakeTransferRepository();
    storage = new FakeObjectStorage();
    sessions = new StubUploadSessionStore();
    sweeper = new ExpirySweeperService(rooms, transfers, storage, sessions);
  });

  // Seeds an ACTIVE room holding one file transfer whose object sits in storage.
  async function seedRoomWithFile(code: string, expiresAt: Date): Promise<string> {
    const room = await rooms.create({ code, expiresAt });
    const transfer = await transfers.create({
      roomId: room.id,
      payloadType: 'FILE',
      contentLength: 3n,
    });
    const storageKey = fileObjectKey(room.id, transfer.id);
    await transfers.createFilePayload({
      transferId: transfer.id,
      fileName: 'f.bin',
      fileSizeBytes: 3n,
      mimeType: 'application/octet-stream',
      storageKey,
    });
    await storage.putObject(storageKey, Buffer.from('abc'));
    return room.id;
  }

  describe('expireRooms', () => {
    it('flips a past-expiry active room to EXPIRED and purges its file object', async () => {
      const roomId = await seedRoomWithFile('AAAAAA', HOUR_AGO);
      const storageKey = fileObjectKey(roomId, [...transfers.transfers.values()][0].id);

      const count = await sweeper.expireRooms();

      expect(count).toBe(1);
      expect((await rooms.findById(roomId))?.status).toBe('EXPIRED');
      expect(storage.objects.has(storageKey)).toBe(false);
      expect(transfers.transfers.size).toBe(0);
      expect(transfers.filePayloads.size).toBe(0);
    });

    it('leaves a live room and its object untouched', async () => {
      const roomId = await seedRoomWithFile('BBBBBB', HOUR_AHEAD);

      const count = await sweeper.expireRooms();

      expect(count).toBe(0);
      expect((await rooms.findById(roomId))?.status).toBe('ACTIVE');
      expect(storage.objects.size).toBe(1);
      expect(transfers.transfers.size).toBe(1);
    });

    it('isolates a per-room failure so the rest of the batch still sweeps', async () => {
      const failRoomId = await seedRoomWithFile('CCCCCC', HOUR_AGO);
      const okRoomId = await seedRoomWithFile('DDDDDD', HOUR_AGO);
      const failKey = fileObjectKey(failRoomId, onlyTransferId(transfers, failRoomId));
      const okKey = fileObjectKey(okRoomId, onlyTransferId(transfers, okRoomId));

      jest.spyOn(storage, 'removeObject').mockImplementation((key) => {
        if (key === failKey) return Promise.reject(new Error('storage down'));
        storage.objects.delete(key);
        return Promise.resolve();
      });

      const count = await sweeper.expireRooms();

      expect(count).toBe(1);
      // The failing room is left ACTIVE with its data intact, so the next sweep retries it.
      expect((await rooms.findById(failRoomId))?.status).toBe('ACTIVE');
      expect(storage.objects.has(failKey)).toBe(true);
      // The healthy room still completes.
      expect((await rooms.findById(okRoomId))?.status).toBe('EXPIRED');
      expect(storage.objects.has(okKey)).toBe(false);
    });

    it('flips a past-expiry room that never held a file', async () => {
      const room = await rooms.create({ code: 'EEEEEE', expiresAt: HOUR_AGO });

      const count = await sweeper.expireRooms();

      expect(count).toBe(1);
      expect((await rooms.findById(room.id))?.status).toBe('EXPIRED');
    });
  });

  describe('reapAbandonedUploads', () => {
    it('removes chunk and file objects, deletes rows, and frees an abandoned session', async () => {
      const roomId = 'room-x';
      const transfer = await transfers.create({
        id: 'tx-1',
        roomId,
        payloadType: 'FILE',
        contentLength: 6n,
      });
      await transfers.createFilePayload({
        transferId: transfer.id,
        fileName: 'partial.bin',
        fileSizeBytes: 6n,
        mimeType: 'application/octet-stream',
        storageKey: fileObjectKey(roomId, transfer.id),
      });
      await storage.putObject(chunkObjectKey(roomId, transfer.id, 0), Buffer.from('abc'));
      await storage.putObject(chunkObjectKey(roomId, transfer.id, 1), Buffer.from('def'));
      sessions.abandoned = [
        {
          transferId: transfer.id,
          roomId,
          fileName: 'partial.bin',
          fileSizeBytes: 6,
          mimeType: 'application/octet-stream',
          totalChunks: 4,
          receivedChunks: new Set([0, 1]),
        },
      ];

      const count = await sweeper.reapAbandonedUploads();

      expect(count).toBe(1);
      expect(storage.objects.size).toBe(0);
      expect(transfers.transfers.size).toBe(0);
      expect(transfers.filePayloads.size).toBe(0);
      expect(sessions.deleted).toEqual([transfer.id]);
    });

    it('asks the store for sessions opened before now minus the TTL', async () => {
      const now = new Date('2026-07-19T12:00:00.000Z');

      await sweeper.reapAbandonedUploads(now);

      expect(sessions.lastOpenedBefore?.getTime()).toBe(now.getTime() - ABANDONED_UPLOAD_TTL_MS);
    });

    it('isolates a per-session failure so the rest are still reaped', async () => {
      sessions.abandoned = [makeSession('fails'), makeSession('ok')];
      jest.spyOn(storage, 'removeObject').mockImplementation((key) => {
        if (key === fileObjectKey('room-x', 'fails')) {
          return Promise.reject(new Error('storage down'));
        }
        return Promise.resolve();
      });

      const count = await sweeper.reapAbandonedUploads();

      expect(count).toBe(1);
      expect(sessions.deleted).toEqual(['ok']);
    });
  });

  describe('sweep', () => {
    it('runs both the room expiry and the abandoned-upload passes', async () => {
      const roomId = await seedRoomWithFile('FFFFFF', HOUR_AGO);
      sessions.abandoned = [makeSession('tx-2')];

      await sweeper.sweep();

      expect((await rooms.findById(roomId))?.status).toBe('EXPIRED');
      expect(sessions.deleted).toEqual(['tx-2']);
    });
  });
});

function makeSession(transferId: string): UploadSession {
  return {
    transferId,
    roomId: 'room-x',
    fileName: 'f.bin',
    fileSizeBytes: 3,
    mimeType: 'application/octet-stream',
    totalChunks: 1,
    receivedChunks: new Set(),
  };
}

function onlyTransferId(repo: FakeTransferRepository, roomId: string): string {
  const found = [...repo.transfers.values()].find((t) => t.roomId === roomId);
  if (!found) throw new Error(`no transfer for ${roomId}`);
  return found.id;
}
