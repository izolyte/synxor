import { Inject, Injectable } from '@nestjs/common';
import { ROOM_REPOSITORY, type RoomRepository } from '../domain/room/room.repository';
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
    const code = await this.generateUniqueCode();
    const room = await this.rooms.create({ code, expiresAt });
    const roomToken = this.tokenIssuer.sign({ roomId: room.id, role: 'sender' }, expiresAt);
    return { roomCode: room.code, roomToken };
  }

  private async generateUniqueCode(attempt = 0): Promise<string> {
    if (attempt >= MAX_CODE_ATTEMPTS) {
      throw new Error('Failed to generate unique Room Code after maximum attempts');
    }
    const code = this.codeGen.generate();
    const existing = await this.rooms.findByCode(code);
    return existing ? this.generateUniqueCode(attempt + 1) : code;
  }
}
