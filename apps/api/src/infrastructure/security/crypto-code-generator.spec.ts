import { CryptoCodeGenerator } from './crypto-code-generator';
import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROOM_CODE_PATTERN,
} from '../../domain/room/room-code';

describe('CryptoCodeGenerator', () => {
  const generator = new CryptoCodeGenerator();

  it('produces a code matching the Room Code pattern', () => {
    expect(generator.generate()).toMatch(ROOM_CODE_PATTERN);
  });

  it('only ever emits characters from the alphabet', () => {
    const allowed = new Set(ROOM_CODE_ALPHABET);
    for (let i = 0; i < 1_000; i++) {
      for (const char of generator.generate()) {
        expect(allowed.has(char)).toBe(true);
      }
    }
  });

  it('always emits exactly the configured length', () => {
    for (let i = 0; i < 1_000; i++) {
      expect(generator.generate()).toHaveLength(ROOM_CODE_LENGTH);
    }
  });

  // Every alphabet character must be reachable. A wrong rejection threshold
  // (off-by-one) would silently drop the last few symbols; over ~12k emitted
  // characters each of the 36 is virtually certain to appear if reachable.
  it('can reach every character in the alphabet', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2_000; i++) {
      for (const char of generator.generate()) seen.add(char);
    }
    expect(seen.size).toBe(ROOM_CODE_ALPHABET.length);
  });
});
