import { EXPIRY_VALUES, resolveExpiresAt, type Expiry } from './room-expiry';
import { InvalidExpiryError } from './room.errors';
import { DAY_MS, HOUR_MS } from '../../common/time';

describe('room-expiry', () => {
  it('exposes exactly the three Expiry options', () => {
    expect(EXPIRY_VALUES).toEqual(['1h', '24h', '7d']);
  });

  describe('resolveExpiresAt', () => {
    it.each<[Expiry, number]>([
      ['1h', HOUR_MS],
      ['24h', 24 * HOUR_MS],
      ['7d', 7 * DAY_MS],
    ])('maps %s to now + its duration', (expiry, ms) => {
      const now = 1_000_000;
      expect(resolveExpiresAt(expiry, now).getTime()).toBe(now + ms);
    });

    it('throws on an unknown Expiry instead of an Invalid Date', () => {
      expect(() => resolveExpiresAt('2h' as Expiry, 0)).toThrow(InvalidExpiryError);
    });
  });
});
