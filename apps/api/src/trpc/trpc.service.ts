import { Injectable } from '@nestjs/common';
import { router } from './init';
import { RoomRouter } from '../room/room.router';

@Injectable()
export class TrpcService {
  readonly appRouter: ReturnType<typeof this.buildAppRouter>;

  constructor(private readonly roomRouter: RoomRouter) {
    this.appRouter = this.buildAppRouter();
  }

  private buildAppRouter() {
    return router({
      room: this.roomRouter.router,
    });
  }
}

export type AppRouter = TrpcService['appRouter'];
