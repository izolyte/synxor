import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { PersistenceModule } from './infrastructure/persistence/persistence.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HealthModule, PersistenceModule],
})
export class AppModule {}
