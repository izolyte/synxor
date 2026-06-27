import type { Room, RoomStatus } from './room.entity';
import { isExpired } from './room-status';
import { HOUR_MS } from '../../common/time';

function room(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-1',
    code: 'AB3X7Z',
    status: 'ACTIVE',
    expiresAt: new Date(Date.now() + HOUR_MS),
    createdAt: new Date(),
    ...overrides,
  };
}

describe('isExpired', () => {
  it('is false for an ACTIVE Room before its Expiry', () => {
    expect(isExpired(room())).toBe(false);
  });

  it('is true for an ACTIVE Room past its Expiry (not yet swept)', () => {
    expect(isExpired(room({ expiresAt: new Date(Date.now() - 1) }))).toBe(true);
  });

  it('is true at the exact Expiry instant', () => {
    const now = new Date();
    expect(isExpired(room({ expiresAt: now }), now)).toBe(true);
  });

  it.each<RoomStatus>(['EXPIRED', 'CLOSED'])(
    'is true for a %s Room regardless of Expiry timestamp',
    (status) => {
      const future = new Date(Date.now() + HOUR_MS);
      expect(isExpired(room({ status, expiresAt: future }))).toBe(true);
    },
  );
});
