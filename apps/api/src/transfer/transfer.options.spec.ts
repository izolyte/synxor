import { resolveMaxFileSizeBytes } from './transfer.options';

describe('resolveMaxFileSizeBytes', () => {
  it('parses the env value', () => {
    expect(resolveMaxFileSizeBytes('1048576')).toBe(1048576);
  });

  it('falls back to 5 GB when unset', () => {
    expect(resolveMaxFileSizeBytes(undefined)).toBe(5 * 1024 * 1024 * 1024);
  });

  it('rejects a non-numeric or non-positive value', () => {
    expect(() => resolveMaxFileSizeBytes('abc')).toThrow();
    expect(() => resolveMaxFileSizeBytes('0')).toThrow();
  });
});
