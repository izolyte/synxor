import { parseAllowedOrigins } from './cors-origins';

describe('parseAllowedOrigins', () => {
  const ENV = 'ALLOWED_ORIGINS';

  it('allows any origin when unset (dev default)', () => {
    expect(parseAllowedOrigins(ENV, undefined)).toBe('*');
    expect(parseAllowedOrigins(ENV, '')).toBe('*');
    expect(parseAllowedOrigins(ENV, '   ')).toBe('*');
  });

  it('returns a single origin as a one-element list', () => {
    expect(parseAllowedOrigins(ENV, 'https://app.synxor.io')).toEqual(['https://app.synxor.io']);
  });

  it('splits a comma-separated list and trims each entry', () => {
    expect(parseAllowedOrigins(ENV, 'https://a.io, https://b.io ,https://c.io')).toEqual([
      'https://a.io',
      'https://b.io',
      'https://c.io',
    ]);
  });

  it('drops empty entries from a trailing or doubled comma', () => {
    expect(parseAllowedOrigins(ENV, 'https://a.io,,')).toEqual(['https://a.io']);
  });

  it('fails closed instead of defaulting to "*" when unset in production', () => {
    expect(() => parseAllowedOrigins(ENV, undefined, { production: true })).toThrow(
      /ALLOWED_ORIGINS/,
    );
    expect(() => parseAllowedOrigins(ENV, '   ', { production: true })).toThrow();
  });

  it('names the offending env var in the failure', () => {
    expect(() =>
      parseAllowedOrigins('WS_ALLOWED_ORIGINS', undefined, { production: true }),
    ).toThrow(/WS_ALLOWED_ORIGINS/);
  });

  it('still honours an explicit allowlist in production', () => {
    expect(parseAllowedOrigins(ENV, 'https://app.synxor.io', { production: true })).toEqual([
      'https://app.synxor.io',
    ]);
  });
});
