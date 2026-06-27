import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PersistenceModule } from '../infrastructure/persistence/persistence.module';
import { RoomService } from './room.service';
import { CryptoCodeGenerator } from './crypto-code-generator';
import { JwtTokenIssuer } from './jwt-token-issuer';
import { CODE_GENERATOR } from './code-generator.interface';
import { TOKEN_ISSUER } from './token-issuer.interface';

@Module({
  imports: [
    PersistenceModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { algorithm: 'HS256' },
      }),
    }),
  ],
  providers: [
    RoomService,
    { provide: CODE_GENERATOR, useClass: CryptoCodeGenerator },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
  ],
  exports: [RoomService],
})
export class RoomModule {}
