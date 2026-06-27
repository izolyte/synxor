import { Injectable } from '@nestjs/common';
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { RoomService } from './room.service';

const t = initTRPC.create();

@Injectable()
export class RoomRouter {
  readonly router: ReturnType<typeof this.buildRouter>;

  constructor(private readonly roomService: RoomService) {
    this.router = this.buildRouter();
  }

  private buildRouter() {
    return t.router({
      create: t.procedure
        .input(z.object({ expiry: z.enum(['1h', '24h', '7d']) }))
        .mutation(({ input }) => this.roomService.create(input.expiry)),
    });
  }
}

export type RoomTrpcRouter = RoomRouter['router'];
