// A Participant's display identity: a colour + name the whole Room shares for a
// given peer. Derived deterministically from a stable per-Participant key (the
// Room Token hash), so the same person keeps the same identity across reload and
// reconnect for the life of the Room, and every Participant resolves a peer to
// the same colour + name without the server storing anything for the auto case.
//
// The backend owns this module: it assigns identities and broadcasts them. The
// web client mirrors only the colour KEYS (to map colorKey → a CSS token); the
// word lists and hashing stay here so attribution is decided in one place.

export interface ParticipantIdentity {
  // Opaque, stable id for this identity (derived from the stable key, never the
  // key itself). Lets the client group a peer's messages so a rename can update
  // all of them at once.
  key: string;
  // Palette colour key; the client maps it to --identity-<colorKey>.
  colorKey: string;
  // The auto "Colour Noun" (e.g. "Indigo Heron"), or an edited display name.
  name: string;
}

// Curated off-teal hues, distinct from the teal brand accent. Each `word` is the
// adjective in the auto name; each `key` maps to a --identity-<key> CSS token
// that clears WCAG 4.5:1 on the app surfaces in both light and dark. Keep the
// keys in sync with the web mirror and globals.css.
export const IDENTITY_PALETTE = [
  { key: 'violet', word: 'Violet' },
  { key: 'indigo', word: 'Indigo' },
  { key: 'plum', word: 'Plum' },
  { key: 'magenta', word: 'Magenta' },
  { key: 'rose', word: 'Rose' },
  { key: 'coral', word: 'Coral' },
  { key: 'amber', word: 'Amber' },
  { key: 'gold', word: 'Gold' },
] as const;

export const IDENTITY_COLOR_KEYS = IDENTITY_PALETTE.map((c) => c.key);

// Calm, neutral nouns that read well after any colour word.
const IDENTITY_NOUNS = [
  'Heron',
  'Otter',
  'Falcon',
  'Marten',
  'Lynx',
  'Sparrow',
  'Ibis',
  'Wren',
  'Osprey',
  'Kestrel',
  'Puffin',
  'Tanager',
  'Vireo',
  'Sable',
  'Ermine',
  'Badger',
  'Beaver',
  'Grebe',
  'Plover',
  'Finch',
] as const;

// An edited name past this is trimmed away — a label, not a message.
export const MAX_DISPLAY_NAME_CHARS = 40;

// FNV-1a (32-bit). A stable, well-spread string hash — no crypto strength needed,
// only that the same key always lands on the same colour + noun.
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// Collapse whitespace and cap length; empty (or whitespace-only) reads as "clear
// the override" and falls back to the auto name.
export function sanitizeDisplayName(name: string | null | undefined): string | null {
  const trimmed = name?.replace(/\s+/g, ' ').trim() ?? '';
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_DISPLAY_NAME_CHARS);
}

// Resolve a stable key (the Room Token hash) to its identity. An edited
// displayName overrides the auto name; the colour and opaque key are always
// derived, so a rename never changes a peer's colour.
export function deriveIdentity(
  stableKey: string,
  displayName?: string | null,
): ParticipantIdentity {
  const colourHash = fnv1a(stableKey);
  // Salt the noun hash so the colour and noun indices vary independently — same
  // colour, different noun, and vice versa.
  const nounHash = fnv1a(`${stableKey} noun`);
  const colour = IDENTITY_PALETTE[colourHash % IDENTITY_PALETTE.length];
  const noun = IDENTITY_NOUNS[nounHash % IDENTITY_NOUNS.length];
  const override = sanitizeDisplayName(displayName);
  return {
    key: colourHash.toString(36),
    colorKey: colour.key,
    name: override ?? `${colour.word} ${noun}`,
  };
}
