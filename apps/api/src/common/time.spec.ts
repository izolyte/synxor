import { SECOND_MS, MINUTE_MS, HOUR_MS, DAY_MS, secondsUntil } from './time';

describe('time', () => {
  it('derives each unit from the one below it', () => {
    expect(MINUTE_MS).toBe(60 * SECOND_MS);
    expect(HOUR_MS).toBe(60 * MINUTE_MS);
    expect(DAY_MS).toBe(24 * HOUR_MS);
  });

  describe('secondsUntil', () => {
    it('returns whole seconds until a future instant', () => {
      const now = 1_000_000;
      expect(secondsUntil(new Date(now + HOUR_MS), now)).toBe(3_600);
    });

    it('floors a sub-second remainder', () => {
      expect(secondsUntil(new Date(1_900), 0)).toBe(1);
    });

    it('is negative once the instant has passed', () => {
      const now = 10_000;
      expect(secondsUntil(new Date(now - 5_000), now)).toBe(-5);
    });
  });
});
