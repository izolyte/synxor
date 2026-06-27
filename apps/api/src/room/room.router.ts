import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { router, publicProcedure } from '../trpc/init';
import { RoomService } from './room.service';

@Injectable()
export class RoomRouter {
  readonly router: ReturnType<typeof this.buildRouter>;

  constructor(private readonly roomService: RoomService) {
    this.router = this.buildRouter();
  }

  private buildRouter() {
    return router({
      create: publicProcedure
        .input(z.object({ expiry: z.enum(['1h', '24h', '7d']) }))
        .mutation(({ input }) => this.roomService.create(input.expiry)),
    });
  }
}
