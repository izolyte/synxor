// The env slice both resolvers read; import.meta.env satisfies it. Passed in
// (never read here) so resolution stays pure and unit-testable.
export interface ApiUrlEnv {
  VITE_API_URL?: string;
  DEV: boolean;
}

/**
 * Resolves the API server origin every non-tRPC surface talks to: the Socket.io
 * handshake, chunked uploads, download links. VITE_API_URL may carry a trailing
 * slash or the /trpc suffix (it's shared with the tRPC client); both are
 * stripped so callers always get a bare origin. Unset means localhost in dev
 * and a hard failure anywhere else — a silently wrong origin would be worse.
 */
export function resolveApiOrigin(env: ApiUrlEnv): string {
  const base = env.VITE_API_URL;
  if (!base) {
    if (env.DEV) return "http://localhost:3000";
    throw new Error("VITE_API_URL must be set outside local development");
  }
  return base.replace(/\/+$/, "").replace(/\/trpc$/, "");
}
