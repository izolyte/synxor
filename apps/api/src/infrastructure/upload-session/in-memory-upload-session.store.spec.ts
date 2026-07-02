import { InMemoryUploadSessionStore } from './in-memory-upload-session.store';
import { UploadSessionNotFoundError } from '../../domain/transfer/transfer.errors';
import type { CreateUploadSessionInput } from '../../domain/transfer/upload-session';

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

  beforeEach(() => {
    store = new InMemoryUploadSessionStore();
  });

  it('creates a session with no chunks received', async () => {
    const session = await store.create(input());
    expect(session).toMatchObject({ transferId: 'transfer-1', roomId: 'room-1', totalChunks: 2 });
    expect(session.receivedChunks.size).toBe(0);
  });

  it('returns null for an unknown transfer', async () => {
    await expect(store.get('nope')).resolves.toBeNull();
  });

  it('records received chunks and is idempotent per index', async () => {
    await store.create(input());
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
    await store.create(input());
    await store.delete('transfer-1');
    await expect(store.get('transfer-1')).resolves.toBeNull();
    await expect(store.delete('transfer-1')).resolves.toBeUndefined();
  });

  it('counts only the sessions of the given room', async () => {
    await store.create(input({ transferId: 't1' }));
    await store.create(input({ transferId: 't2' }));
    await store.create(input({ transferId: 't3', roomId: 'other-room' }));
    await expect(store.countByRoom('room-1')).resolves.toBe(2);
    await expect(store.countByRoom('empty-room')).resolves.toBe(0);
  });

  it('hands out snapshots that later mutations do not touch', async () => {
    await store.create(input());
    const before = await store.get('transfer-1');
    await store.markReceived('transfer-1', 0);
    expect(before?.receivedChunks.size).toBe(0);
  });
});
