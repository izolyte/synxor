import { InMemoryUploadSessionStore } from './in-memory-upload-session.store';
import { UploadSessionNotFoundError } from '../../domain/transfer/transfer.errors';
import type { CreateUploadSessionInput } from '../../domain/transfer/upload-session';
import { SECOND_MS } from '../../common/time';

function input(overrides: Partial<CreateUploadSessionInput> = {}): CreateUploadSessionInput {
  return {
    transferId: 'transfer-1',
    roomId: 'room-1',
    fileName: 'video.mp4',
    fileSizeBytes: 100,
    mimeType: 'video/mp4',
    totalChunks: 2,
    ...overrides,
  };
}

describe('InMemoryUploadSessionStore', () => {
  let store: InMemoryUploadSessionStore;

  // Reserve with a cap high enough not to interfere unless a test is about the cap.
  const seed = (overrides: Partial<CreateUploadSessionInput> = {}) =>
    store.reserve(input(overrides), 100);

  beforeEach(() => {
    store = new InMemoryUploadSessionStore();
  });

  it('reserves a session with no chunks received', async () => {
    const session = await seed();
    expect(session).toMatchObject({ transferId: 'transfer-1', roomId: 'room-1', totalChunks: 2 });
    expect(session?.receivedChunks.size).toBe(0);
  });

  it('returns null for an unknown transfer', async () => {
    await expect(store.get('nope')).resolves.toBeNull();
  });

  it('records received chunks and is idempotent per index', async () => {
    await seed();
    await store.markReceived('transfer-1', 0);
    await store.markReceived('transfer-1', 0);
    const session = await store.markReceived('transfer-1', 1);
    expect(session.receivedChunks.size).toBe(2);
    expect([...session.receivedChunks].sort()).toEqual([0, 1]);
  });

  it('rejects markReceived for an unknown transfer', async () => {
    await expect(store.markReceived('nope', 0)).rejects.toThrow(UploadSessionNotFoundError);
  });

  it('deletes a session and tolerates deleting one that is already gone', async () => {
    await seed();
    await store.delete('transfer-1');
    await expect(store.get('transfer-1')).resolves.toBeNull();
    await expect(store.delete('transfer-1')).resolves.toBeUndefined();
  });

  it('enforces the per-room cap and counts only that room', async () => {
    expect(await store.reserve(input({ transferId: 't1' }), 2)).not.toBeNull();
    expect(await store.reserve(input({ transferId: 't2' }), 2)).not.toBeNull();
    // Third open in the same room is over the cap.
    expect(await store.reserve(input({ transferId: 't3' }), 2)).toBeNull();
    // A different room has its own count.
    expect(
      await store.reserve(input({ transferId: 't4', roomId: 'other-room' }), 2),
    ).not.toBeNull();
  });

  it('frees a slot when a session is deleted', async () => {
    await store.reserve(input({ transferId: 't1' }), 1);
    expect(await store.reserve(input({ transferId: 't2' }), 1)).toBeNull();
    await store.delete('t1');
    expect(await store.reserve(input({ transferId: 't2' }), 1)).not.toBeNull();
  });

  it('hands out snapshots that later mutations do not touch', async () => {
    await seed();
    const before = await store.get('transfer-1');
    await store.markReceived('transfer-1', 0);
    expect(before?.receivedChunks.size).toBe(0);
  });

  describe('findAbandoned', () => {
    it('returns sessions opened before the cutoff', async () => {
      await seed({ transferId: 't1' });
      const stale = await store.findAbandoned(new Date(Date.now() + SECOND_MS));
      expect(stale.map((s) => s.transferId)).toEqual(['t1']);
    });

    it('excludes sessions opened at or after the cutoff', async () => {
      await seed({ transferId: 't1' });
      const stale = await store.findAbandoned(new Date(Date.now() - SECOND_MS));
      expect(stale).toEqual([]);
    });

    it('returns snapshots detached from later mutations', async () => {
      await seed({ transferId: 't1' });
      const [stale] = await store.findAbandoned(new Date(Date.now() + SECOND_MS));
      await store.markReceived('t1', 0);
      expect(stale.receivedChunks.size).toBe(0);
    });
  });
});
