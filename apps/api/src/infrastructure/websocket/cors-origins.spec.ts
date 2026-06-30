import { parseAllowedOrigins } from './cors-origins';

describe('parseAllowedOrigins', () => {
  it('allows any origin when unset (dev default)', () => {
    expect(parseAllowedOrigins(undefined)).toBe('*');
    expect(parseAllowedOrigins('')).toBe('*');
    expect(parseAllowedOrigins('   ')).toBe('*');
  });

  it('returns a single origin as a one-element list', () => {
    expect(parseAllowedOrigins('https://app.synxor.io')).toEqual(['https://app.synxor.io']);
  });

  it('splits a comma-separated list and trims each entry', () => {
    expect(parseAllowedOrigins('https://a.io, https://b.io ,https://c.io')).toEqual([
      'https://a.io',
      'https://b.io',
      'https://c.io',
    ]);
  });

  it('drops empty entries from a trailing or doubled comma', () => {
    expect(parseAllowedOrigins('https://a.io,,')).toEqual(['https://a.io']);
  });

  it('fails closed instead of defaulting to "*" when unset in production', () => {
    expect(() => parseAllowedOrigins(undefined, { production: true })).toThrow(
      /WS_ALLOWED_ORIGINS/,
    );
    expect(() => parseAllowedOrigins('   ', { production: true })).toThrow();
  });

  it('still honours an explicit allowlist in production', () => {
    expect(parseAllowedOrigins('https://app.synxor.io', { production: true })).toEqual([
      'https://app.synxor.io',
    ]);
  });
});
