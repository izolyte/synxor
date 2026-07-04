import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CODE_GENERATOR } from '../../domain/security/code-generator';
import { TOKEN_ISSUER } from '../../domain/security/token-issuer';
import { TOKEN_VERIFIER } from '../../domain/security/token-verifier';
import { CryptoCodeGenerator } from './crypto-code-generator';
import { JwtTokenIssuer } from './jwt-token-issuer';
import { JwtTokenVerifier } from './jwt-token-verifier';
import {
  JWT_ALGORITHM,
  JWT_AUDIENCE,
  JWT_ISSUER,
  JWT_SECRET_ENV,
  JWT_SECRET_MIN_BYTES,
} from './security.constants';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.getOrThrow<string>(JWT_SECRET_ENV).trim();
        if (Buffer.byteLength(secret, 'utf8') < JWT_SECRET_MIN_BYTES) {
          throw new Error(`${JWT_SECRET_ENV} must be at least ${JWT_SECRET_MIN_BYTES} bytes`);
        }
        return {
          secret,
          signOptions: { algorithm: JWT_ALGORITHM, issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
        };
      },
    }),
  ],
  providers: [
    { provide: CODE_GENERATOR, useClass: CryptoCodeGenerator },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
    { provide: TOKEN_VERIFIER, useClass: JwtTokenVerifier },
  ],
  exports: [CODE_GENERATOR, TOKEN_ISSUER, TOKEN_VERIFIER],
})
export class SecurityModule {}
