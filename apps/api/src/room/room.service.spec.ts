import { Logger } from '@nestjs/common';
import { RoomService } from './room.service';
import type { Expiry } from '../domain/room/room-expiry';
import { RoomCodeExhaustionError } from '../domain/room/room.errors';
import { ROOM_CODE_MAX_ATTEMPTS, ROOM_CODE_PATTERN } from '../domain/room/room-code';
import { InMemoryRoomRepository } from '../domain/room/room.repository.fake';
import type { CodeGenerator } from '../domain/security/code-generator';
import { TokenRole, type TokenClaims, type TokenIssuer } from '../domain/security/token-issuer';
import { DAY_MS, HOUR_MS } from '../common/time';

const CLOCK_TOLERANCE_MS = 50;

class FakeCodeGenerator implements CodeGenerator {
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

class FakeTokenIssuer implements TokenIssuer {
  readonly calls: Array<{ claims: TokenClaims; expiresAt: Date }> = [];
  shouldThrow = false;

  sign(claims: TokenClaims, expiresAt: Date): string {
    if (this.shouldThrow) throw new Error('signing failed');
    this.calls.push({ claims, expiresAt });
    return `tok.${claims.roomId}.${claims.role}`;
  }
}

function setup(codes: string[], overrides: { existingCodes?: string[] } = {}) {
  const repo = new InMemoryRoomRepository();
  for (const code of overrides.existingCodes ?? []) {
    repo.stored.set(code, {
      id: `pre-${code}`,
      code,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + HOUR_MS),
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
    it('returns a Room Code matching the format', async () => {
      const { service } = setup(['AB3X7Z']);
      const result = await service.create('1h');
      expect(result.roomCode).toMatch(ROOM_CODE_PATTERN);
    });

    it('retries on collision and returns the next unique code', async () => {
      const { service, repo } = setup(['TAKEN1', 'UNIQU2'], {
        existingCodes: ['TAKEN1'],
      });
      const result = await service.create('1h');
      expect(result.roomCode).toBe('UNIQU2');
      expect(repo.stored.has('UNIQU2')).toBe(true);
    });

    it(`throws after ${ROOM_CODE_MAX_ATTEMPTS} consecutive collisions`, async () => {
      const collisions = Array<string>(ROOM_CODE_MAX_ATTEMPTS).fill('CLASH1');
      const { service } = setup(collisions, { existingCodes: ['CLASH1'] });
      await expect(service.create('1h')).rejects.toThrow(RoomCodeExhaustionError);
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

    it('still surfaces the signing error and logs when orphan cleanup also fails', async () => {
      const { service, repo, tokenIssuer } = setup(['ORPHN2']);
      tokenIssuer.shouldThrow = true;
      jest.spyOn(repo, 'delete').mockRejectedValueOnce(new Error('delete failed'));
      const errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      await expect(service.create('1h')).rejects.toThrow('signing failed');
      expect(errorLog).toHaveBeenCalled();
      // Spy auto-restored via jest `restoreMocks` (see package.json).
    });
  });

  describe('Room Token', () => {
    it('issues a token with the roomId and the sender role', async () => {
      const { service, repo, tokenIssuer } = setup(['JWTAB1']);
      await service.create('24h');
      const room = repo.stored.get('JWTAB1')!;
      expect(tokenIssuer.calls).toHaveLength(1);
      expect(tokenIssuer.calls[0].claims).toEqual({
        roomId: room.id,
        role: TokenRole.Sender,
      });
    });

    it('returns the token string from the issuer', async () => {
      const { service, repo } = setup(['TOKRE1']);
      const result = await service.create('1h');
      const room = repo.stored.get('TOKRE1')!;
      expect(result.roomToken).toBe(`tok.${room.id}.${TokenRole.Sender}`);
    });
  });

  describe('Expiry', () => {
    it.each<[Expiry, string, number]>([
      ['1h', 'HOUR01', HOUR_MS],
      ['24h', 'DAY024', 24 * HOUR_MS],
      ['7d', 'WEEK07', 7 * DAY_MS],
    ])('sets expiresAt ≈ now + %s', async (expiry, code, ms) => {
      const before = Date.now();
      const { service, repo } = setup([code]);
      await service.create(expiry);
      const after = Date.now();

      const room = repo.stored.get(code)!;
      const expiresMs = room.expiresAt.getTime();
      expect(expiresMs).toBeGreaterThanOrEqual(before + ms);
      expect(expiresMs).toBeLessThanOrEqual(after + ms + CLOCK_TOLERANCE_MS);
    });
  });
});
