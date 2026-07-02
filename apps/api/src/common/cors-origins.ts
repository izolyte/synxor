// Env vars holding the CORS allowlists — HTTP and Socket.io are configured
// separately (the WS server is created by an adapter, not enableCors) but
// parse identically so a deployment can't end up with divergent policies.
export const ALLOWED_ORIGINS_ENV = 'ALLOWED_ORIGINS';
export const WS_ALLOWED_ORIGINS_ENV = 'WS_ALLOWED_ORIGINS';

// Translates a comma-separated origins env value into a CORS `origin`.
// Set → an explicit allowlist. Unset → '*' for local dev convenience, but in
// production an unset value fails closed: a deployment must opt in to an
// allowlist rather than silently exposing the server to every origin.
export function parseAllowedOrigins(
  envVar: string,
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
      `${envVar} must list explicit origins in production; refusing to default to "*".`,
    );
  }
  return '*';
}
