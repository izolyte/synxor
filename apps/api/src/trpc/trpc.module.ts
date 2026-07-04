import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Express } from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { RoomModule } from '../room/room.module';
import { TrpcService } from './trpc.service';
import { RoomRouter } from './routers/room.router';
import { TRPC_PATH } from './trpc.constants';
import { DomainError } from '../domain/shared/domain-error';

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
    const app = this.httpAdapterHost.httpAdapter.getInstance<Express>();
    app.use(
      TRPC_PATH,
      createExpressMiddleware({
        router: this.trpcService.appRouter,
        // tRPC swallows the original error into a generic 500 response; without
        // this it never reaches a log, leaving 500 spikes untraceable. Name the
        // domain error when there is one so the log says what actually failed.
        onError: ({ path, error }) => {
          const cause = error.cause;
          const detail =
            cause instanceof DomainError ? `${cause.name}: ${cause.message}` : error.message;
          this.logger.error(`tRPC ${path ?? '<no-path>'}: ${detail}`, error.stack);
        },
      }),
    );
  }
}
