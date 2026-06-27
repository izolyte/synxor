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
    return this.jwt.sign(claims, { expiresIn: secondsUntil(expiresAt) });
  }
}
