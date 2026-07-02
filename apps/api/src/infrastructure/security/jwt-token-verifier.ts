import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { TokenClaims } from '../../domain/security/token-issuer';
import type { TokenVerifier } from '../../domain/security/token-verifier';
import { JWT_ALGORITHM, JWT_AUDIENCE, JWT_ISSUER } from './security.constants';

@Injectable()
export class JwtTokenVerifier implements TokenVerifier {
  constructor(private readonly jwt: JwtService) {}

  verify(token: string): TokenClaims {
    // Pin the accepted algorithm so a token signed with anything other than our
    // symmetric scheme (e.g. an "alg: none" or RS/HS confusion attempt) is rejected,
    // and require our iss/aud so a token minted for another service fails too.
    const claims = this.jwt.verify<TokenClaims & { sub?: string }>(token, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    // Our issuer always sets sub = roomId; a disagreement means the token was
    // assembled outside that path, so fail closed.
    if (claims.sub !== claims.roomId) {
      throw new Error('Room Token subject does not match roomId');
    }
    return claims;
  }
}
