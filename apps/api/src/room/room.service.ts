import { Inject, Injectable, Logger } from '@nestjs/common';
import { ROOM_REPOSITORY, type RoomRepository } from '../domain/room/room.repository';
import { RoomCodeCollisionError, RoomCodeExhaustionError } from '../domain/room/room.errors';
import type { Room } from '../domain/room/room.entity';
import type { CreateRoomResult } from './dto/create-room.dto';
import { ROOM_CODE_MAX_ATTEMPTS } from '../domain/room/room-code';
import { type Expiry, resolveExpiresAt } from '../domain/room/room-expiry';
import { CODE_GENERATOR, type CodeGenerator } from '../domain/security/code-generator';
import { TOKEN_ISSUER, TokenRole, type TokenIssuer } from '../domain/security/token-issuer';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: RoomRepository,
    @Inject(CODE_GENERATOR) private readonly codeGen: CodeGenerator,
    @Inject(TOKEN_ISSUER) private readonly tokenIssuer: TokenIssuer,
  ) {}

  async create(expiry: Expiry): Promise<CreateRoomResult> {
    const expiresAt = resolveExpiresAt(expiry);
    const room = await this.createRoomWithUniqueCode(expiresAt);

    try {
      const roomToken = this.tokenIssuer.sign({ roomId: room.id, role: TokenRole.Sender }, expiresAt);
      return { roomCode: room.code, roomToken };
    } catch (err) {
      // Token signing failed after persistence — drop the orphan so a retry
      // doesn't leave an unreachable Room sitting until Expiry. Surface a cleanup
      // failure rather than swallowing it, so orphans stay observable.
      await this.rooms.delete(room.id).catch((cleanupErr) => {
        this.logger.error(
          `Failed to delete orphaned Room ${room.id} after token signing failed`,
          cleanupErr instanceof Error ? cleanupErr.stack : String(cleanupErr),
        );
      });
      throw err;
    }
  }

  // Lets the DB's unique constraint on Room.code arbitrate collisions, rather
  // than a racy read-then-write, then retries on the resulting domain error.
  private async createRoomWithUniqueCode(expiresAt: Date): Promise<Room> {
    for (let attempt = 0; attempt < ROOM_CODE_MAX_ATTEMPTS; attempt++) {
      try {
        return await this.rooms.create({ code: this.codeGen.generate(), expiresAt });
      } catch (err) {
        if (err instanceof RoomCodeCollisionError) continue;
        throw err;
      }
    }
    throw new RoomCodeExhaustionError(ROOM_CODE_MAX_ATTEMPTS);
  }
}
