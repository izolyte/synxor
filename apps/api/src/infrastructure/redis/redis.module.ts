import { Global, Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS_CLIENT, REDIS_URL_ENV } from './redis.constants';

// Global: Redis backs cross-cutting concerns (rate limiting, Room state, the
// future Socket.io scaling adapter), so every module gets the one shared client.
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<Redis> => {
        const logger = new Logger(RedisModule.name);
        // lazyConnect makes the await below the single startup gate: an
        // unreachable Redis fails the boot instead of retrying silently in the
        // background while the app serves traffic without it.
        const client = new Redis(config.getOrThrow<string>(REDIS_URL_ENV), {
          lazyConnect: true,
        });
        await client.connect();
        logger.log('Redis connected');
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.client.quit();
  }
}
