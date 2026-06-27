import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { TrpcModule } from './../src/trpc/trpc.module';
import { TRPC_PATH } from './../src/trpc/trpc.constants';
import { PrismaService } from './../src/infrastructure/persistence/prisma/prisma.service';
import { JWT_SECRET_ENV } from './../src/infrastructure/security/security.constants';
import { ROOM_REPOSITORY } from './../src/domain/room/room.repository';
import { InMemoryRoomRepository } from './../src/domain/room/room.repository.fake';
import { ROOM_CODE_PATTERN } from './../src/domain/room/room-code';

// Fakes the persistence seam (InMemoryRoomRepository + stubbed PrismaService) so
// the test exercises the full HTTP → tRPC → router → service → JWT path without
// a live Postgres.
describe('Room creation (e2e)', () => {
  let app: INestApplication<App>;
  let priorJwtSecret: string | undefined;

  beforeAll(async () => {
    priorJwtSecret = process.env[JWT_SECRET_ENV];
    process.env[JWT_SECRET_ENV] = 'test-secret-at-least-32-characters-long';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), TrpcModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(ROOM_REPOSITORY)
      .useValue(new InMemoryRoomRepository())
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

  it('returns a Room Code and a signed Room Token', async () => {
    const res = await request(app.getHttpServer())
      .post(`${TRPC_PATH}/room.create`)
      .send({ expiry: '1h' })
      .expect(200);

    const { roomCode, roomToken } = res.body.result.data;
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
