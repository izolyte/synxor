import { Injectable } from '@nestjs/common';
import { initTRPC } from '@trpc/server';
import { RoomRouter } from '../room/room.router';

const t = initTRPC.create();

@Injectable()
export class TrpcService {
  readonly appRouter: ReturnType<typeof this.buildAppRouter>;

  constructor(private readonly roomRouter: RoomRouter) {
    this.appRouter = this.buildAppRouter();
  }

  private buildAppRouter() {
    return t.router({
      room: this.roomRouter.router,
    });
  }
}

export type AppRouter = TrpcService['appRouter'];
