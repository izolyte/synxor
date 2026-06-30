// Translates the WS_ALLOWED_ORIGINS env value into a Socket.io CORS `origin`.
// Unset → '*' so local dev works without config; set → an explicit allowlist.
export function parseAllowedOrigins(raw: string | undefined): string | string[] {
  const origins = (raw ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return origins.length > 0 ? origins : '*';
}
