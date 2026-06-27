export const TOKEN_ISSUER = Symbol('TOKEN_ISSUER');

export interface TokenClaims {
  roomId: string;
  role: 'sender' | 'receiver';
}

export interface ITokenIssuer {
  sign(claims: TokenClaims, expiresAt: Date): string;
}
