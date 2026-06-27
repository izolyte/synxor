import { Inject, Injectable } from '@nestjs/common';
import { ROOM_REPOSITORY, type RoomRepository } from '../domain/room/room.repository';
import { RoomCodeCollisionError } from '../domain/room/room.errors';
import type { Room } from '../domain/room/room.entity';
import { CODE_GENERATOR, type ICodeGenerator } from './code-generator.interface';
import { TOKEN_ISSUER, type ITokenIssuer } from './token-issuer.interface';

export type Expiry = '1h' | '24h' | '7d';

const EXPIRY_MS: Record<Expiry, number> = {
  '1h': 60 * 60 * 1_000,
  '24h': 24 * 60 * 60 * 1_000,
  '7d': 7 * 24 * 60 * 60 * 1_000,
};

const MAX_CODE_ATTEMPTS = 5;

@Injectable()
export class RoomService {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: RoomRepository,
    @Inject(CODE_GENERATOR) private readonly codeGen: ICodeGenerator,
    @Inject(TOKEN_ISSUER) private readonly tokenIssuer: ITokenIssuer,
  ) {}

  async create(expiry: Expiry): Promise<{ roomCode: string; roomToken: string }> {
    const expiresAt = new Date(Date.now() + EXPIRY_MS[expiry]);
    const room = await this.createRoomWithUniqueCode(expiresAt);

    try {
      const roomToken = this.tokenIssuer.sign({ roomId: room.id, role: 'sender' }, expiresAt);
      return { roomCode: room.code, roomToken };
    } catch (err) {
      // Token signing failed after persistence — drop the orphan so a retry
      // doesn't leave an unreachable Room sitting until Expiry.
      await this.rooms.delete(room.id).catch(() => undefined);
      throw err;
    }
  }

  // Lets the DB's unique constraint on Room.code arbitrate collisions, rather
  // than a racy read-then-write, then retries on the resulting domain error.
  private async createRoomWithUniqueCode(expiresAt: Date): Promise<Room> {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      try {
        return await this.rooms.create({ code: this.codeGen.generate(), expiresAt });
      } catch (err) {
        if (err instanceof RoomCodeCollisionError) continue;
        throw err;
      }
    }
    throw new Error('Failed to generate unique Room Code after maximum attempts');
  }
}
