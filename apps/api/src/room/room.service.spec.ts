import { RoomService, type Expiry } from './room.service';
import type { RoomRepository } from '../domain/room/room.repository';
import { RoomCodeCollisionError } from '../domain/room/room.errors';
import type { ICodeGenerator } from './code-generator.interface';
import type { ITokenIssuer, TokenClaims } from './token-issuer.interface';
import type { Room, CreateRoomInput, RoomStatus } from '../domain/room/room.entity';

class FakeRoomRepository implements RoomRepository {
  readonly stored = new Map<string, Room>();

  async create(input: CreateRoomInput): Promise<Room> {
    if (this.stored.has(input.code)) {
      throw new RoomCodeCollisionError(input.code);
    }
    const room: Room = {
      id: `room-${this.stored.size + 1}`,
      code: input.code,
      status: 'ACTIVE',
      expiresAt: input.expiresAt,
      createdAt: new Date(),
    };
    this.stored.set(room.code, room);
    return room;
  }

  async findByCode(code: string): Promise<Room | null> {
    return this.stored.get(code) ?? null;
  }

  async findById(id: string): Promise<Room | null> {
    return [...this.stored.values()].find((r) => r.id === id) ?? null;
  }

  async updateStatus(id: string, status: RoomStatus): Promise<Room> {
    const room = [...this.stored.values()].find((r) => r.id === id)!;
    const updated: Room = { ...room, status };
    this.stored.set(room.code, updated);
    return updated;
  }

  async findExpiredActive(): Promise<Room[]> {
    const now = new Date();
    return [...this.stored.values()].filter(
      (r) => r.status === 'ACTIVE' && r.expiresAt <= now,
    );
  }

  async delete(id: string): Promise<void> {
    const room = [...this.stored.values()].find((r) => r.id === id);
    if (room) this.stored.delete(room.code);
  }
}

class FakeCodeGenerator implements ICodeGenerator {
  private queue: string[];

  constructor(...codes: string[]) {
    this.queue = codes;
  }

  generate(): string {
    const next = this.queue.shift();
    if (!next) throw new Error('FakeCodeGenerator: no more codes queued');
    return next;
  }
}

class FakeTokenIssuer implements ITokenIssuer {
  readonly calls: Array<{ claims: TokenClaims; expiresAt: Date }> = [];
  shouldThrow = false;

  sign(claims: TokenClaims, expiresAt: Date): string {
    if (this.shouldThrow) throw new Error('signing failed');
    this.calls.push({ claims, expiresAt });
    return `tok.${claims.roomId}.${claims.role}`;
  }
}

function setup(codes: string[], overrides: { existingCodes?: string[] } = {}) {
  const repo = new FakeRoomRepository();
  for (const code of overrides.existingCodes ?? []) {
    repo.stored.set(code, {
      id: `pre-${code}`,
      code,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 3600_000),
      createdAt: new Date(),
    });
  }
  const codeGen = new FakeCodeGenerator(...codes);
  const tokenIssuer = new FakeTokenIssuer();
  const service = new RoomService(repo, codeGen, tokenIssuer);
  return { service, repo, codeGen, tokenIssuer };
}

describe('RoomService.create', () => {
  describe('Room Code', () => {
    it('returns a 6-char uppercase alphanumeric Room Code', async () => {
      const { service } = setup(['AB3X7Z']);
      const result = await service.create('1h');
      expect(result.roomCode).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('retries on collision and returns the next unique code', async () => {
      const { service, repo } = setup(['TAKEN1', 'UNIQU2'], {
        existingCodes: ['TAKEN1'],
      });
      const result = await service.create('1h');
      expect(result.roomCode).toBe('UNIQU2');
      expect(repo.stored.has('UNIQU2')).toBe(true);
    });

    it('throws after 5 consecutive collisions', async () => {
      const { service } = setup(['CLASH1', 'CLASH1', 'CLASH1', 'CLASH1', 'CLASH1'], {
        existingCodes: ['CLASH1'],
      });
      await expect(service.create('1h')).rejects.toThrow(
        'Failed to generate unique Room Code',
      );
    });
  });

  describe('persistence', () => {
    it('persists the Room via the repository', async () => {
      const { service, repo } = setup(['STORE1']);
      await service.create('1h');
      expect(repo.stored.has('STORE1')).toBe(true);
    });

    it('deletes the orphaned Room when token signing fails', async () => {
      const { service, repo, tokenIssuer } = setup(['ORPHN1']);
      tokenIssuer.shouldThrow = true;
      await expect(service.create('1h')).rejects.toThrow('signing failed');
      expect(repo.stored.has('ORPHN1')).toBe(false);
    });
  });

  describe('Room Token', () => {
    it('issues a token with roomId and role:sender', async () => {
      const { service, repo, tokenIssuer } = setup(['JWTAB1']);
      await service.create('24h');
      const room = repo.stored.get('JWTAB1')!;
      expect(tokenIssuer.calls).toHaveLength(1);
      expect(tokenIssuer.calls[0].claims).toEqual({
        roomId: room.id,
        role: 'sender',
      });
    });

    it('returns the token string from the issuer', async () => {
      const { service, repo } = setup(['TOKRE1']);
      const result = await service.create('1h');
      const room = repo.stored.get('TOKRE1')!;
      expect(result.roomToken).toBe(`tok.${room.id}.sender`);
    });
  });

  describe('Expiry', () => {
    it.each<[Expiry, string, number]>([
      ['1h', 'HOUR01', 60 * 60 * 1_000],
      ['24h', 'DAY024', 24 * 60 * 60 * 1_000],
      ['7d', 'WEEK07', 7 * 24 * 60 * 60 * 1_000],
    ])('sets expiresAt ≈ now + %s', async (expiry, code, ms) => {
      const before = Date.now();
      const { service, repo } = setup([code]);
      await service.create(expiry);
      const after = Date.now();

      const room = repo.stored.get(code)!;
      const expiresMs = room.expiresAt.getTime();
      expect(expiresMs).toBeGreaterThanOrEqual(before + ms);
      expect(expiresMs).toBeLessThanOrEqual(after + ms + 50); // 50 ms tolerance
    });
  });
});
