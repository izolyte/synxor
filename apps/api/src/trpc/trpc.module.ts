import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { RoomModule } from '../room/room.module';
import { TrpcService } from './trpc.service';
import { RoomRouter } from '../room/room.router';

@Module({
  imports: [RoomModule],
  providers: [TrpcService, RoomRouter],
})
export class TrpcModule implements OnModuleInit {
  private readonly logger = new Logger(TrpcModule.name);

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly trpcService: TrpcService,
  ) {}

  onModuleInit() {
    const app = this.httpAdapterHost.httpAdapter.getInstance();
    app.use(
      '/trpc',
      createExpressMiddleware({
        router: this.trpcService.appRouter,
        // tRPC swallows the original error into a generic 500 response; without
        // this it never reaches a log, leaving 500 spikes untraceable.
        onError: ({ path, error }) =>
          this.logger.error(`tRPC ${path ?? '<no-path>'}: ${error.message}`, error.stack),
      }),
    );
  }
}
