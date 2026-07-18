import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { z } from 'zod';
import request from 'supertest';
import { App } from 'supertest/types';
import { trpcResult } from './trpc-response';
import { TrpcModule } from './../src/trpc/trpc.module';
import { TRPC_PATH } from './../src/trpc/trpc.constants';
import { PrismaService } from './../src/infrastructure/persistence/prisma/prisma.service';
import { JWT_SECRET_ENV } from './../src/infrastructure/security/security.constants';
import { ROOM_REPOSITORY } from './../src/domain/room/room.repository';
import { InMemoryRoomRepository } from './../src/domain/room/room.repository.fake';
import { TRANSFER_REPOSITORY } from './../src/domain/transfer/transfer.repository';
import { FakeTransferRepository } from './../src/domain/transfer/transfer.repository.fake';
import { DELIVERY_REPOSITORY } from './../src/domain/delivery/delivery.repository';
import { FakeDeliveryRepository } from './../src/domain/delivery/delivery.repository.fake';
import { ROOM_CODE_PATTERN } from './../src/domain/room/room-code';

// Fakes the persistence seam (InMemoryRoomRepository + stubbed PrismaService) so
// the test exercises the full HTTP → tRPC → router → service → JWT path without
// a live Postgres. `rooms` is held in scope so a spec can seed Room state the
// public API can't reach on its own (e.g. an already-expired Room).
describe('Room API (e2e)', () => {
  let app: INestApplication<App>;
  let rooms: InMemoryRoomRepository;
  let transfers: FakeTransferRepository;
  let deliveries: FakeDeliveryRepository;
  let priorJwtSecret: string | undefined;

  beforeAll(async () => {
    priorJwtSecret = process.env[JWT_SECRET_ENV];
    process.env[JWT_SECRET_ENV] = 'test-secret-at-least-32-characters-long';
    rooms = new InMemoryRoomRepository();
    transfers = new FakeTransferRepository();
    deliveries = new FakeDeliveryRepository();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), TrpcModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(ROOM_REPOSITORY)
      .useValue(rooms)
      .overrideProvider(TRANSFER_REPOSITORY)
      .useValue(transfers)
      .overrideProvider(DELIVERY_REPOSITORY)
      .useValue(deliveries)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    // Don't leak the test secret into other suites sharing this worker.
    if (priorJwtSecret === undefined) {
      delete process.env[JWT_SECRET_ENV];
    } else {
      process.env[JWT_SECRET_ENV] = priorJwtSecret;
    }
  });

  describe('room.create', () => {
    it('returns a Room Code and a signed Room Token', async () => {
      const res = await request(app.getHttpServer())
        .post(`${TRPC_PATH}/room.create`)
        .send({ expiry: '1h' })
        .expect(200);

      const { roomCode, roomToken, expiresAt } = trpcResult(
        z.object({ roomCode: z.string(), roomToken: z.string(), expiresAt: z.string() }),
      ).parse(res.body).result.data;
      expect(roomCode).toMatch(ROOM_CODE_PATTERN);
      expect(roomToken.split('.')).toHaveLength(3); // header.payload.signature
      // ISO 8601 string (no tRPC transformer), parseable and in the future.
      const expiresMs = new Date(expiresAt).getTime();
      expect(Number.isNaN(expiresMs)).toBe(false);
      expect(expiresMs).toBeGreaterThan(Date.now());
    });

    it('rejects an unknown expiry with 400', async () => {
      await request(app.getHttpServer())
        .post(`${TRPC_PATH}/room.create`)
        .send({ expiry: '2h' })
        .expect(400);
    });
  });

  describe('room.join', () => {
    const joinResult = trpcResult(z.object({ roomToken: z.string(), roomId: z.string() }));
    // tRPC error envelope. A thrown domain error currently surfaces as
    // INTERNAL_SERVER_ERROR / 500 — mapping domain errors to 4xx is deferred to
    // #28 — so the negative cases assert the stable part: the surfaced message,
    // which proves the specific rejection fired rather than a generic crash.
    const trpcErrorMessage = z.object({ error: z.object({ message: z.string() }) });

    it('issues a Receiver Room Token for a valid Room Code', async () => {
      const created = await request(app.getHttpServer())
        .post(`${TRPC_PATH}/room.create`)
        .send({ expiry: '1h' })
        .expect(200);
      const { roomCode } = trpcResult(
        z.object({ roomCode: z.string(), roomToken: z.string() }),
      ).parse(created.body).result.data;

      const joined = await request(app.getHttpServer())
        .post(`${TRPC_PATH}/room.join`)
        .send({ roomCode })
        .expect(200);

      const { roomToken, roomId } = joinResult.parse(joined.body).result.data;
      expect(roomToken.split('.')).toHaveLength(3); // header.payload.signature
      expect(roomId).not.toHaveLength(0);
    });

    it('rejects a malformed Room Code with 400', async () => {
      await request(app.getHttpServer())
        .post(`${TRPC_PATH}/room.join`)
        .send({ roomCode: 'nope' })
        .expect(400);
    });

    it('rejects an unknown Room Code', async () => {
      const res = await request(app.getHttpServer())
        .post(`${TRPC_PATH}/room.join`)
        .send({ roomCode: 'ZZ9ZZ9' });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(joinResult.safeParse(res.body).success).toBe(false);
      expect(trpcErrorMessage.parse(res.body).error.message).toBe(
        'No Room found for Room Code: ZZ9ZZ9',
      );
    });

    it('rejects an expired Room', async () => {
      rooms.stored.set('EXPIR1', {
        id: 'room-expired',
        code: 'EXPIR1',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post(`${TRPC_PATH}/room.join`)
        .send({ roomCode: 'EXPIR1' });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(joinResult.safeParse(res.body).success).toBe(false);
      expect(trpcErrorMessage.parse(res.body).error.message).toBe(
        'Room is no longer available: EXPIR1',
      );
    });
  });

  describe('room.transfers', () => {
    const historyResult = trpcResult(
      z.array(
        z.object({
          id: z.string(),
          payloadType: z.enum(['FILE', 'TEXT_SNIPPET', 'LINK']),
          fileName: z.string().nullable(),
          fileSizeBytes: z.number().nullable(),
          delivered: z.boolean(),
          createdAt: z.string(),
        }),
      ),
    );

    // A query rides GET with the input JSON-encoded in the query string — no tRPC
    // transformer, so the bigint file size must already be a plain number on the
    // wire (a raw bigint would throw on serialize).
    function get(roomCode: string) {
      return request(app.getHttpServer())
        .get(`${TRPC_PATH}/room.transfers`)
        .query({ input: JSON.stringify({ roomCode }) });
    }

    it('returns a file Transfer with delivery status as plain JSON', async () => {
      rooms.stored.set('LOGE2E', {
        id: 'room-log',
        code: 'LOGE2E',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
      });
      const transfer = await transfers.create({
        roomId: 'room-log',
        payloadType: 'FILE',
        contentLength: BigInt(4096),
      });
      await transfers.createFilePayload({
        transferId: transfer.id,
        fileName: 'clip.mp4',
        fileSizeBytes: BigInt(4096),
        mimeType: 'video/mp4',
        storageKey: 'k1',
      });
      await deliveries.create({ transferId: transfer.id, deliveredAt: new Date() });

      const res = await get('LOGE2E').expect(200);
      const items = historyResult.parse(res.body).result.data;
      expect(items).toEqual([
        {
          id: transfer.id,
          payloadType: 'FILE',
          fileName: 'clip.mp4',
          fileSizeBytes: 4096,
          delivered: true,
          createdAt: transfer.createdAt.toISOString(),
        },
      ]);
    });

    it('rejects a malformed Room Code with 400', async () => {
      await get('nope').expect(400);
    });
  });
});
