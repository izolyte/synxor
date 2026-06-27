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
import { ROOM_CODE_PATTERN } from './../src/domain/room/room-code';

// Fakes the persistence seam (InMemoryRoomRepository + stubbed PrismaService) so
// the test exercises the full HTTP → tRPC → router → service → JWT path without
// a live Postgres. `rooms` is held in scope so a spec can seed Room state the
// public API can't reach on its own (e.g. an already-expired Room).
describe('Room API (e2e)', () => {
  let app: INestApplication<App>;
  let rooms: InMemoryRoomRepository;
  let priorJwtSecret: string | undefined;

  beforeAll(async () => {
    priorJwtSecret = process.env[JWT_SECRET_ENV];
    process.env[JWT_SECRET_ENV] = 'test-secret-at-least-32-characters-long';
    rooms = new InMemoryRoomRepository();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), TrpcModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(ROOM_REPOSITORY)
      .useValue(rooms)
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

      const { roomCode, roomToken } = trpcResult(
        z.object({ roomCode: z.string(), roomToken: z.string() }),
      ).parse(res.body).result.data;
      expect(roomCode).toMatch(ROOM_CODE_PATTERN);
      expect(roomToken.split('.')).toHaveLength(3); // header.payload.signature
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
    });
  });
});
