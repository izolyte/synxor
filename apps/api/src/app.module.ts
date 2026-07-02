import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { PersistenceModule } from './infrastructure/persistence/persistence.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { TrpcModule } from './trpc/trpc.module';
import { TransferModule } from './transfer/transfer.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    PersistenceModule,
    StorageModule,
    TrpcModule,
    TransferModule,
  ],
})
export class AppModule {}
