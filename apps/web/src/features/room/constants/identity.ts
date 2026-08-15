import type { ParticipantIdentity } from "~/features/room/constants/transfer";

// The colour keys the server assigns (deriveIdentity in apps/api's
// domain/participant/participant-identity.ts). Mirrored here only to map a
// colorKey onto its --identity-<key> CSS token; the word lists + hashing stay on
// the server. Keep this set and globals.css in sync with the API palette.
export const IDENTITY_COLOR_KEYS = [
  "violet",
  "indigo",
  "plum",
  "magenta",
  "rose",
  "coral",
  "amber",
  "gold",
] as const;

// Mirror of the API's MAX_DISPLAY_NAME_CHARS — the rename input is capped here so
// an over-limit name is trimmed before it reaches the socket.
export const MAX_DISPLAY_NAME_CHARS = 40;

const KNOWN_KEYS = new Set<string>(IDENTITY_COLOR_KEYS);

// The CSS colour for an identity. Falls back to the muted ink for an unknown key
// (protocol drift, a bad server build) so a stray value can't inject an arbitrary
// custom-property name.
export function identityColorVar(colorKey: string): string {
  return KNOWN_KEYS.has(colorKey)
    ? `var(--identity-${colorKey})`
    : "var(--color-ink-muted)";
}

// Up-to-two-letter initials for an avatar: the first letter of each of the first
// two words (e.g. "Indigo Heron" → "IH", "Alice" → "A").
export function identityInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.slice(0, 2).map((w) => w[0]!.toUpperCase());
  return letters.join("");
}

// A peer identity is "known enough" to render as an identity (name + colour +
// avatar) rather than a bare role when the server supplied one.
export function hasIdentity(
  identity: ParticipantIdentity | null | undefined,
): identity is ParticipantIdentity {
  return !!identity && typeof identity.name === "string" && identity.name.length > 0;
}
