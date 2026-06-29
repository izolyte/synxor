import { ROOM_CODE_LENGTH } from "~/features/room/constants/room-code";

// Codes are 6 upper-case alphanumerics. Strip non-alphanumerics and keep the last
// six, so a paste survives stray spaces, punctuation, or a copied ".../room/ABC123"
// tail (which collapses to "ROOMABC123" → "ABC123"). Tolerates non-string input
// (e.g. a duplicated ?code= query param arrives as an array) as empty — a sanitizer
// must never throw on bad input.
export function sanitizeRoomCode(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(-ROOM_CODE_LENGTH);
}
