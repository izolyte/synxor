// Translates the WS_ALLOWED_ORIGINS env value into a Socket.io CORS `origin`.
// Set → an explicit allowlist. Unset → '*' for local dev convenience, but in
// production an unset value fails closed: a deployment must opt in to an
// allowlist rather than silently exposing the socket to every origin.
export function parseAllowedOrigins(
  raw: string | undefined,
  opts: { production?: boolean } = {},
): string | string[] {
  const origins = (raw ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (origins.length > 0) return origins;

  if (opts.production) {
    throw new Error(
      'WS_ALLOWED_ORIGINS must list explicit origins in production; refusing to default to "*".',
    );
  }
  return '*';
}
