import { Module, OnModuleInit } from '@nestjs/common';
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
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly trpcService: TrpcService,
  ) {}

  onModuleInit() {
    const app = this.httpAdapterHost.httpAdapter.getInstance();
    app.use(
      '/trpc',
      createExpressMiddleware({ router: this.trpcService.appRouter }),
    );
  }
}
