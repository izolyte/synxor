import { chunkObjectKey, fileObjectKey } from './storage-key';

describe('fileObjectKey', () => {
  it('scopes the object under the room and transfer', () => {
    expect(fileObjectKey('room-1', 'transfer-9')).toBe('rooms/room-1/transfers/transfer-9/file');
  });
});

describe('chunkObjectKey', () => {
  it('places chunks alongside the final object', () => {
    expect(chunkObjectKey('room-1', 'transfer-9', 0)).toBe(
      'rooms/room-1/transfers/transfer-9/chunks/00000',
    );
  });

  it('zero-pads so lexicographic order matches chunk order', () => {
    const keys = [0, 2, 10, 99999].map((i) => chunkObjectKey('r', 't', i));
    expect([...keys].sort()).toEqual(keys);
  });

  it('gives every chunk index a distinct key', () => {
    expect(chunkObjectKey('r', 't', 1)).not.toBe(chunkObjectKey('r', 't', 10));
  });
});
