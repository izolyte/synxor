export const TOKEN_ISSUER = Symbol('TOKEN_ISSUER');

export const TokenRole = {
  Sender: 'sender',
  Receiver: 'receiver',
} as const;
export type TokenRole = (typeof TokenRole)[keyof typeof TokenRole];

export interface TokenClaims {
  roomId: string;
  role: TokenRole;
}

export interface TokenIssuer {
  sign(claims: TokenClaims, expiresAt: Date): string;
}
