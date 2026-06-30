import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { TokenClaims } from '../../domain/security/token-issuer';
import type { TokenVerifier } from '../../domain/security/token-verifier';
import { JWT_ALGORITHM } from './security.constants';

@Injectable()
export class JwtTokenVerifier implements TokenVerifier {
  constructor(private readonly jwt: JwtService) {}

  verify(token: string): TokenClaims {
    // Pin the accepted algorithm so a token signed with anything other than our
    // symmetric scheme (e.g. an "alg: none" or RS/HS confusion attempt) is rejected.
    return this.jwt.verify<TokenClaims>(token, { algorithms: [JWT_ALGORITHM] });
  }
}
