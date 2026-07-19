import { Logger } from '@nestjs/common';
import { RoomService } from './room.service';
import type { Expiry } from '../domain/room/room-expiry';
import {
  RoomCodeExhaustionError,
  RoomExpiredError,
  RoomNotFoundError,
} from '../domain/room/room.errors';
import { ROOM_CODE_MAX_ATTEMPTS, ROOM_CODE_PATTERN } from '../domain/room/room-code';
import { InMemoryRoomRepository } from '../domain/room/room.repository.fake';
import { FakeTransferRepository } from '../domain/transfer/transfer.repository.fake';
import { FakeDeliveryRepository } from '../domain/delivery/delivery.repository.fake';
import type { Room, RoomStatus } from '../domain/room/room.entity';
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
  const transfers = new FakeTransferRepository();
  const deliveries = new FakeDeliveryRepository();
  const service = new RoomService(repo, codeGen, tokenIssuer, transfers, deliveries);
  return { service, repo, codeGen, tokenIssuer, transfers, deliveries };
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

    it('returns expiresAt as the Room expiry in ISO 8601', async () => {
      const { service, repo } = setup(['EXPAT1']);
      const result = await service.create('1h');
      const room = repo.stored.get('EXPAT1')!;
      expect(result.expiresAt).toBe(room.expiresAt.toISOString());
    });
  });
});

function seedRoom(repo: InMemoryRoomRepository, room: Partial<Room> & { code: string }): Room {
  const full: Room = {
    id: `seed-${room.code}`,
    status: 'ACTIVE',
    expiresAt: new Date(Date.now() + HOUR_MS),
    createdAt: new Date(),
    ...room,
  };
  repo.stored.set(full.code, full);
  return full;
}

describe('RoomService.join', () => {
  it('returns a Receiver Room Token and the roomId for a valid Room Code', async () => {
    const { service, repo } = setup([]);
    const room = seedRoom(repo, { code: 'JOIN01' });

    const result = await service.join('JOIN01');

    expect(result).toEqual({
      roomToken: `tok.${room.id}.${TokenRole.Receiver}`,
      roomId: room.id,
    });
  });

  it('signs the token with the roomId, receiver role, and the Room Expiry', async () => {
    const { service, repo, tokenIssuer } = setup([]);
    const room = seedRoom(repo, { code: 'CLAIM1' });

    await service.join('CLAIM1');

    expect(tokenIssuer.calls).toHaveLength(1);
    expect(tokenIssuer.calls[0]).toEqual({
      claims: { roomId: room.id, role: TokenRole.Receiver },
      expiresAt: room.expiresAt,
    });
  });

  it('throws RoomNotFoundError when no Room matches the Room Code', async () => {
    const { service } = setup([]);
    await expect(service.join('NOPE99')).rejects.toThrow(RoomNotFoundError);
  });

  it('throws RoomExpiredError when the Room is past its Expiry', async () => {
    const { service, repo } = setup([]);
    seedRoom(repo, { code: 'GONE01', expiresAt: new Date(Date.now() - 1) });
    await expect(service.join('GONE01')).rejects.toThrow(RoomExpiredError);
  });

  it.each<RoomStatus>(['EXPIRED', 'CLOSED'])(
    'throws RoomExpiredError when the Room status is %s',
    async (status) => {
      const { service, repo } = setup([]);
      seedRoom(repo, { code: 'SHUT01', status, expiresAt: new Date(Date.now() + HOUR_MS) });
      await expect(service.join('SHUT01')).rejects.toThrow(RoomExpiredError);
    },
  );

  it('does not issue a token when the Room is expired', async () => {
    const { service, repo, tokenIssuer } = setup([]);
    seedRoom(repo, { code: 'GONE02', expiresAt: new Date(Date.now() - 1) });

    await expect(service.join('GONE02')).rejects.toThrow(RoomExpiredError);
    expect(tokenIssuer.calls).toHaveLength(0);
  });
});

describe('RoomService.transfers', () => {
  it('throws RoomNotFoundError for an unknown Room Code', async () => {
    const { service } = setup([]);
    await expect(service.listTransfers('NOPE01')).rejects.toThrow(RoomNotFoundError);
  });

  it('returns an empty history for a Room with no Transfers', async () => {
    const { service, repo } = setup([]);
    seedRoom(repo, { code: 'EMPTY1' });
    await expect(service.listTransfers('EMPTY1')).resolves.toEqual([]);
  });

  it('maps a file Transfer with its payload metadata, narrowing bigint to number', async () => {
    const { service, repo, transfers } = setup([]);
    const room = seedRoom(repo, { code: 'LOG001' });
    const transfer = await transfers.create({
      roomId: room.id,
      payloadType: 'FILE',
      contentLength: BigInt(2048),
    });
    await transfers.createFilePayload({
      transferId: transfer.id,
      fileName: 'video.mp4',
      fileSizeBytes: BigInt(2048),
      mimeType: 'video/mp4',
      storageKey: 'key-1',
    });

    const [item] = await service.listTransfers('LOG001');
    expect(item).toEqual({
      id: transfer.id,
      payloadType: 'FILE',
      fileName: 'video.mp4',
      fileSizeBytes: 2048,
      delivered: false,
      createdAt: transfer.createdAt.toISOString(),
    });
    expect(typeof item.fileSizeBytes).toBe('number');
  });

  it('marks a Transfer delivered once a Delivery row exists', async () => {
    const { service, repo, transfers, deliveries } = setup([]);
    const room = seedRoom(repo, { code: 'LOG002' });
    const transfer = await transfers.create({
      roomId: room.id,
      payloadType: 'FILE',
      contentLength: BigInt(10),
    });
    await deliveries.create({ transferId: transfer.id, deliveredAt: new Date() });

    const [item] = await service.listTransfers('LOG002');
    expect(item.delivered).toBe(true);
  });

  it('only returns Transfers for the requested Room', async () => {
    const { service, repo, transfers } = setup([]);
    const mine = seedRoom(repo, { code: 'MINE01' });
    const other = seedRoom(repo, { code: 'OTHR01' });
    await transfers.create({ roomId: mine.id, payloadType: 'FILE', contentLength: BigInt(1) });
    await transfers.create({ roomId: other.id, payloadType: 'FILE', contentLength: BigInt(1) });

    const items = await service.listTransfers('MINE01');
    expect(items).toHaveLength(1);
    expect(items[0].id).toBeDefined();
  });
});
