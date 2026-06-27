import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { ITokenIssuer, TokenClaims } from './token-issuer.interface';

@Injectable()
export class JwtTokenIssuer implements ITokenIssuer {
  constructor(private readonly jwt: JwtService) {}

  sign(claims: TokenClaims, expiresAt: Date): string {
    // Pass expiry through sign options, not a payload `exp` claim: jsonwebtoken
    // rejects a payload that carries `exp` alongside an options `expiresIn`.
    const expiresInSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    return this.jwt.sign(claims, { expiresIn: expiresInSeconds });
  }
}
