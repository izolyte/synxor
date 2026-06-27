import { createRoomSchema } from './create-room.dto';
import { EXPIRY_VALUES } from '../../domain/room/room-expiry';

describe('createRoomSchema', () => {
  it.each(EXPIRY_VALUES)('accepts the valid expiry %s', (expiry) => {
    expect(createRoomSchema.parse({ expiry })).toEqual({ expiry });
  });

  it('rejects an unknown expiry value', () => {
    expect(() => createRoomSchema.parse({ expiry: '2h' })).toThrow();
  });

  it('rejects a missing expiry', () => {
    expect(() => createRoomSchema.parse({})).toThrow();
  });

  it('rejects unknown keys', () => {
    expect(() => createRoomSchema.parse({ expiry: '1h', injected: true })).toThrow();
  });
});
