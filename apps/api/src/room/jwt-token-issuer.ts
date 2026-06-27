import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { ITokenIssuer, TokenClaims } from './token-issuer.interface';

@Injectable()
export class JwtTokenIssuer implements ITokenIssuer {
  constructor(private readonly jwt: JwtService) {}

  sign(claims: TokenClaims, expiresAt: Date): string {
    const exp = Math.floor(expiresAt.getTime() / 1000);
    return this.jwt.sign({ ...claims, exp });
  }
}
