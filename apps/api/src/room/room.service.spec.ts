import { RoomService, type Expiry } from './room.service';
import type { RoomRepository } from '../domain/room/room.repository';
import type { ICodeGenerator } from './code-generator.interface';
import type { ITokenIssuer, TokenClaims } from './token-issuer.interface';
import type { Room, CreateRoomInput, RoomStatus } from '../domain/room/room.entity';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

class FakeRoomRepository implements RoomRepository {
  readonly stored = new Map<string, Room>();

  async create(input: CreateRoomInput): Promise<Room> {
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

  sign(claims: TokenClaims, expiresAt: Date): string {
    this.calls.push({ claims, expiresAt });
    return `tok.${claims.roomId}.${claims.role}`;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Cycle 1 — Room Code format
// ---------------------------------------------------------------------------

describe('RoomService.create', () => {
  it('returns a 6-char uppercase alphanumeric Room Code', async () => {
    const { service } = setup(['AB3X7Z']);
    const result = await service.create('1h');
    expect(result.roomCode).toMatch(/^[A-Z0-9]{6}$/);
  });

  // ---------------------------------------------------------------------------
  // Cycle 2 — Room Code uniqueness / retry
  // ---------------------------------------------------------------------------

  it('retries code generation on collision and returns the next unique code', async () => {
    const { service, repo } = setup(['TAKEN1', 'UNIQUE'], {
      existingCodes: ['TAKEN1'],
    });
    const result = await service.create('1h');
    expect(result.roomCode).toBe('UNIQUE');
    expect(repo.stored.has('UNIQUE')).toBe(true);
  });

  it('throws after 5 consecutive collisions', async () => {
    const { service } = setup(['CLASH', 'CLASH', 'CLASH', 'CLASH', 'CLASH'], {
      existingCodes: ['CLASH'],
    });
    await expect(service.create('1h')).rejects.toThrow(
      'Failed to generate unique Room Code',
    );
  });

  // ---------------------------------------------------------------------------
  // Cycle 3 — Room persisted
  // ---------------------------------------------------------------------------

  it('persists the Room via the repository', async () => {
    const { service, repo } = setup(['STORED']);
    await service.create('1h');
    expect(repo.stored.has('STORED')).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Cycle 4 — JWT claims
  // ---------------------------------------------------------------------------

  it('issues a Room Token with roomId and role:sender', async () => {
    const { service, repo, tokenIssuer } = setup(['JWTABC']);
    await service.create('24h');
    const room = repo.stored.get('JWTABC')!;
    expect(tokenIssuer.calls).toHaveLength(1);
    expect(tokenIssuer.calls[0].claims).toEqual({
      roomId: room.id,
      role: 'sender',
    });
  });

  it('returns the token string from the issuer', async () => {
    const { service, repo } = setup(['TOKRET']);
    const result = await service.create('1h');
    const room = repo.stored.get('TOKRET')!;
    expect(result.roomToken).toBe(`tok.${room.id}.sender`);
  });

  // ---------------------------------------------------------------------------
  // Cycle 5 — Expiry calculation
  // ---------------------------------------------------------------------------

  it.each<[Expiry, number]>([
    ['1h', 60 * 60 * 1_000],
    ['24h', 24 * 60 * 60 * 1_000],
    ['7d', 7 * 24 * 60 * 60 * 1_000],
  ])('sets expiresAt ≈ now + %s (%i ms)', async (expiry, ms) => {
    const before = Date.now();
    const { service, repo } = setup([`EXP${expiry.toUpperCase().replace(/[^A-Z0-9]/g, '')}`]);
    await service.create(expiry);
    const after = Date.now();

    const room = [...repo.stored.values()][0];
    const expiresMs = room.expiresAt.getTime();
    expect(expiresMs).toBeGreaterThanOrEqual(before + ms);
    expect(expiresMs).toBeLessThanOrEqual(after + ms + 50); // 50 ms tolerance
  });
});
