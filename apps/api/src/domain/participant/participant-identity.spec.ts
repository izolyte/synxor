import {
  IDENTITY_COLOR_KEYS,
  MAX_DISPLAY_NAME_CHARS,
  deriveIdentity,
  sanitizeDisplayName,
} from './participant-identity';

describe('deriveIdentity', () => {
  it('is deterministic — the same key always resolves to the same colour and name', () => {
    const a = deriveIdentity('stable-key');
    const b = deriveIdentity('stable-key');
    expect(a).toEqual(b);
  });

  it('assigns a colour from the palette and an auto "Colour Noun" name', () => {
    const identity = deriveIdentity('stable-key');
    expect(IDENTITY_COLOR_KEYS).toContain(identity.colorKey);
    // Auto name is two capitalised words; the first is the colour word.
    expect(identity.name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });

  it('gives different keys distinct identities', () => {
    // The Sender and Receiver tokens hash differently, so the two roles never
    // collide onto one identity.
    const sender = deriveIdentity('sender-hash');
    const receiver = deriveIdentity('receiver-hash');
    expect(sender.key).not.toBe(receiver.key);
    expect(sender).not.toEqual(receiver);
  });

  it('lets an edited display name override the auto name, keeping the colour and key', () => {
    const auto = deriveIdentity('stable-key');
    const named = deriveIdentity('stable-key', 'Alice');
    expect(named.name).toBe('Alice');
    expect(named.colorKey).toBe(auto.colorKey);
    expect(named.key).toBe(auto.key);
  });

  it('falls back to the auto name when the override is blank', () => {
    const auto = deriveIdentity('stable-key');
    expect(deriveIdentity('stable-key', '   ').name).toBe(auto.name);
  });

  it('spreads keys across every palette colour', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) seen.add(deriveIdentity(`key-${i}`).colorKey);
    expect(seen.size).toBe(IDENTITY_COLOR_KEYS.length);
  });
});

describe('sanitizeDisplayName', () => {
  it('trims, collapses whitespace, and caps the length', () => {
    expect(sanitizeDisplayName('  Ada  Lovelace  ')).toBe('Ada Lovelace');
    expect(sanitizeDisplayName('x'.repeat(MAX_DISPLAY_NAME_CHARS + 10))).toHaveLength(
      MAX_DISPLAY_NAME_CHARS,
    );
  });

  it('treats blank input as no override', () => {
    expect(sanitizeDisplayName('   ')).toBeNull();
    expect(sanitizeDisplayName(null)).toBeNull();
    expect(sanitizeDisplayName(undefined)).toBeNull();
  });
});
