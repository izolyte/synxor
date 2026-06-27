import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CODE_GENERATOR } from '../../domain/security/code-generator';
import { TOKEN_ISSUER } from '../../domain/security/token-issuer';
import { CryptoCodeGenerator } from './crypto-code-generator';
import { JwtTokenIssuer } from './jwt-token-issuer';
import { JWT_ALGORITHM, JWT_SECRET_ENV } from './security.constants';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>(JWT_SECRET_ENV),
        signOptions: { algorithm: JWT_ALGORITHM },
      }),
    }),
  ],
  providers: [
    { provide: CODE_GENERATOR, useClass: CryptoCodeGenerator },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
  ],
  exports: [CODE_GENERATOR, TOKEN_ISSUER],
})
export class SecurityModule {}
