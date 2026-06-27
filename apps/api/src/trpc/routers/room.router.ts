import { Injectable } from '@nestjs/common';
import { router, publicProcedure } from '../trpc';
import { RoomService } from '../../room/room.service';
import { createRoomSchema } from '../../room/dto/create-room.dto';
import { joinRoomSchema } from '../../room/dto/join-room.dto';

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
      join: publicProcedure
        .input(joinRoomSchema)
        .mutation(({ input }) => this.roomService.join(input.roomCode)),
    });
  }
}
