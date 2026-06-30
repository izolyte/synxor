import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { TokenClaims } from '../../domain/security/token-issuer';
import type { TokenVerifier } from '../../domain/security/token-verifier';

@Injectable()
export class JwtTokenVerifier implements TokenVerifier {
  constructor(private readonly jwt: JwtService) {}

  verify(token: string): TokenClaims {
    return this.jwt.verify<TokenClaims>(token);
  }
}
