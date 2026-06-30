import { createHash } from 'crypto';
import { hashRoomToken } from './token-hash';

describe('hashRoomToken', () => {
  it('produces the sha256 hex digest of the token', () => {
    const token = 'a.b.c';
    const expected = createHash('sha256').update(token).digest('hex');

    expect(hashRoomToken(token)).toBe(expected);
  });

  it('is deterministic for the same token', () => {
    expect(hashRoomToken('same')).toBe(hashRoomToken('same'));
  });

  it('differs for different tokens', () => {
    expect(hashRoomToken('one')).not.toBe(hashRoomToken('two'));
  });
});
