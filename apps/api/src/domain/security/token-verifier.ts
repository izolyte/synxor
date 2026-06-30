import type { TokenClaims } from './token-issuer';

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');

export interface TokenVerifier {
  /** Returns claims for a valid, unexpired token. Throws on any failure. */
  verify(token: string): TokenClaims;
}
