import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { TokenClaims, TokenIssuer } from '../../domain/security/token-issuer';
import { secondsUntil } from '../../common/time';

@Injectable()
export class JwtTokenIssuer implements TokenIssuer {
  constructor(private readonly jwt: JwtService) {}

  sign(claims: TokenClaims, expiresAt: Date): string {
    // Expiry goes through `expiresIn`, not a payload `exp` claim: jsonwebtoken
    // rejects a payload that carries `exp` alongside an options `expiresIn`.
    // `sub` mirrors roomId (RFC 8725 §3.11) so the verifier can cross-check
    // the standard identity claim against our custom one.
    return this.jwt.sign(claims, { expiresIn: secondsUntil(expiresAt), subject: claims.roomId });
  }
}
