/**
 * Builds a URL from a path and optional query params, prefixed with the current
 * page origin ("" during SSR, where there's no window). One generic builder, so
 * callers compose links from route-path constants instead of a bespoke function
 * per link.
 */
export function buildUrl(path: string, query?: Record<string, string>): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const entries = Object.entries(query ?? {});
  const search = entries.length
    ? "?" +
      entries
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join("&")
    : "";
  return `${origin}${path}${search}`;
}
