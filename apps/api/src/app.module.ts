import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import type { Redis } from 'ioredis';
import { MINUTE_MS } from './common/time';
import { validateEnv } from './common/env.validation';
import { HealthModule } from './health/health.module';
import { PersistenceModule } from './infrastructure/persistence/persistence.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { REDIS_CLIENT } from './infrastructure/redis/redis.constants';
import { StorageModule } from './infrastructure/storage/storage.module';
import { TrpcModule } from './trpc/trpc.module';
import { TransferModule } from './transfer/transfer.module';

// Per-IP request budget — generous enough for normal Room traffic, tight
// enough to blunt brute-forcing of the 6-character Room Code space.
const THROTTLE_TTL_MS = MINUTE_MS;
const THROTTLE_LIMIT = 100;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    RedisModule,
    // Redis-backed so counters survive restarts and hold up across replicas.
    ThrottlerModule.forRootAsync({
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis) => ({
        throttlers: [{ ttl: THROTTLE_TTL_MS, limit: THROTTLE_LIMIT }],
        storage: new ThrottlerStorageRedisService(redis),
      }),
    }),
    HealthModule,
    PersistenceModule,
    StorageModule,
    TrpcModule,
    TransferModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
