import { joinRoomSchema } from './join-room.dto';

describe('joinRoomSchema', () => {
  it('accepts a well-formed Room Code', () => {
    expect(joinRoomSchema.parse({ roomCode: 'AB3X7Z' })).toEqual({ roomCode: 'AB3X7Z' });
  });

  it.each(['ab3x7z', 'AB3X7', 'AB3X7ZZ', 'AB-X7Z', ''])(
    'rejects the malformed Room Code %p',
    (roomCode) => {
      expect(() => joinRoomSchema.parse({ roomCode })).toThrow();
    },
  );

  it('rejects a missing roomCode', () => {
    expect(() => joinRoomSchema.parse({})).toThrow();
  });

  it('rejects unknown keys', () => {
    expect(() => joinRoomSchema.parse({ roomCode: 'AB3X7Z', injected: true })).toThrow();
  });
});
