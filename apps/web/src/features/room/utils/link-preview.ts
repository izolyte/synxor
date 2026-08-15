// A Link Transfer is just the URL — the server keeps no page metadata and we
// never fetch the target (no SSRF surface, no leaking the viewer to it), so a
// Link's "preview" is whatever we can read off the URL itself, parsed here.
export interface LinkPreview {
  /** The URL to open — the original string, untouched. */
  href: string;
  /** Hostname without a leading www., or the raw input if it won't parse. */
  domain: string;
  /** A human-ish title: a cleaned last path segment, else the bare domain. */
  title: string;
}

// Turn the last path segment into something readable: decode %-escapes, drop a
// trailing file extension, swap separators for spaces, sentence-case it. Returns
// null when there's no meaningful path (root, query-only), so the caller can fall
// back to showing the domain prominently.
function pathTitle(pathname: string): string | null {
  const last = pathname.split("/").filter(Boolean).at(-1);
  if (!last) return null;
  let text = last;
  try {
    text = decodeURIComponent(last);
  } catch {
    // A stray %-sequence — keep the raw segment rather than drop the title.
  }
  text = text
    // Only strip an extension that starts with a letter, so a version like
    // "v1.2" or a date "2026.08" keeps its tail.
    .replace(/\.[a-z][a-z0-9]{0,7}$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
  if (!text) return null;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Derive a card's fields from a Link's URL. A LINK payload is classified
// server-side, so a parse failure here is defensive only — fall back to showing
// the raw string rather than throwing and dropping the row.
export function deriveLinkPreview(url: string): LinkPreview {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { href: url, domain: url, title: url };
  }
  const domain = parsed.hostname.replace(/^www\./, "");
  return { href: url, domain, title: pathTitle(parsed.pathname) ?? domain };
}
