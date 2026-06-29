import { Injectable } from '@nestjs/common';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';
import { RoomService } from '../../room/room.service';
import { createRoomSchema } from '../../room/dto/create-room.dto';
import { joinRoomSchema } from '../../room/dto/join-room.dto';
import { RoomExpiredError, RoomNotFoundError } from '../../domain/room/room.errors';

@Injectable()
export class RoomRouter {
  readonly router: ReturnType<typeof this.buildRouter>;

  constructor(private readonly roomService: RoomService) {
    this.router = this.buildRouter();
  }

  private buildRouter() {
    return router({
      create: publicProcedure
        .input(createRoomSchema)
        .mutation(({ input }) => this.roomService.create(input.expiry)),
      join: publicProcedure.input(joinRoomSchema).mutation(async ({ input }) => {
        try {
          return await this.roomService.join(input.roomCode);
        } catch (err) {
          // A missing or expired Room is a client-visible "bad code", not a server
          // fault — surface NOT_FOUND so the web client can tell it apart from a 5xx
          // and react accordingly (retype vs retry).
          if (err instanceof RoomNotFoundError || err instanceof RoomExpiredError) {
            throw new TRPCError({ code: 'NOT_FOUND', message: err.message, cause: err });
          }
          throw err;
        }
      }),
    });
  }
}
