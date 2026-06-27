import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CODE_GENERATOR } from '../../domain/security/code-generator';
import { TOKEN_ISSUER } from '../../domain/security/token-issuer';
import { CryptoCodeGenerator } from './crypto-code-generator';
import { JwtTokenIssuer } from './jwt-token-issuer';
import { JWT_ALGORITHM, JWT_SECRET_ENV, JWT_SECRET_MIN_BYTES } from './security.constants';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.getOrThrow<string>(JWT_SECRET_ENV).trim();
        if (Buffer.byteLength(secret, 'utf8') < JWT_SECRET_MIN_BYTES) {
          throw new Error(`${JWT_SECRET_ENV} must be at least ${JWT_SECRET_MIN_BYTES} bytes`);
        }
        return { secret, signOptions: { algorithm: JWT_ALGORITHM } };
      },
    }),
  ],
  providers: [
    { provide: CODE_GENERATOR, useClass: CryptoCodeGenerator },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
  ],
  exports: [CODE_GENERATOR, TOKEN_ISSUER],
})
export class SecurityModule {}
