import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { io, type Socket } from 'socket.io-client';
import { RoomModule } from './../src/room/room.module';
import { PrismaService } from './../src/infrastructure/persistence/prisma/prisma.service';
import { PARTICIPANT_REPOSITORY } from './../src/domain/participant/participant.repository';
import { InMemoryParticipantRepository } from './../src/domain/participant/participant.repository.fake';
import { TOKEN_ISSUER, TokenRole, type TokenIssuer } from './../src/domain/security/token-issuer';
import { JWT_SECRET_ENV } from './../src/infrastructure/security/security.constants';
import { ConfigurableIoAdapter } from './../src/infrastructure/websocket/configurable-io.adapter';
import { RoomEvent } from './../src/room/room-events';
import { HOUR_MS } from './../src/common/time';

// Proves the gateway over the *real* boot path the app uses: real Room Tokens
// signed by the JWT TokenIssuer, verified by the JWT TokenVerifier, and CORS set
// by ConfigurableIoAdapter — none of it faked. Persistence is the only seam stood
// in (in-memory Participant repo), so no live Postgres is needed.
describe('RoomGateway (e2e, real JWT)', () => {
  let app: INestApplication;
  let port: number;
  let issuer: TokenIssuer;
  let priorJwtSecret: string | undefined;
  const sockets: Socket[] = [];

  const expiresAt = () => new Date(Date.now() + HOUR_MS);

  beforeAll(async () => {
    priorJwtSecret = process.env[JWT_SECRET_ENV];
    process.env[JWT_SECRET_ENV] = 'test-secret-at-least-32-characters-long';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), RoomModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(PARTICIPANT_REPOSITORY)
      .useValue(new InMemoryParticipantRepository())
      .compile();

    app = moduleFixture.createNestApplication();
    app.useWebSocketAdapter(new ConfigurableIoAdapter(app));
    await app.listen(0);
    port = (app.getHttpServer().address() as { port: number }).port;
    issuer = app.get<TokenIssuer>(TOKEN_ISSUER);
  });

  afterEach(() => {
    for (const s of sockets.splice(0)) s.disconnect();
  });

  afterAll(async () => {
    await app.close();
    if (priorJwtSecret === undefined) delete process.env[JWT_SECRET_ENV];
    else process.env[JWT_SECRET_ENV] = priorJwtSecret;
  });

  function open(token?: string): Socket {
    const s = io(`http://localhost:${port}`, {
      auth: token ? { token } : {},
      reconnection: false,
      transports: ['websocket'],
    });
    sockets.push(s);
    return s;
  }

  function once(socket: Socket, event: string): Promise<unknown> {
    return new Promise((resolve) => socket.once(event, resolve));
  }

  it('rejects a connection bearing no Room Token', async () => {
    const socket = open();
    await once(socket, 'disconnect');
    expect(socket.connected).toBe(false);
  });

  it('notifies the Sender as a Receiver joins then leaves', async () => {
    const senderToken = issuer.sign({ roomId: 'room-1', role: TokenRole.Sender }, expiresAt());
    const receiverToken = issuer.sign({ roomId: 'room-1', role: TokenRole.Receiver }, expiresAt());

    const sender = open(senderToken);
    await once(sender, 'connect');

    const joined = once(sender, RoomEvent.Joined);
    const receiver = open(receiverToken);
    expect(await joined).toEqual({ receiverCount: 1 });

    const left = once(sender, RoomEvent.Left);
    receiver.disconnect();
    expect(await left).toEqual({ receiverCount: 0 });
  });
});
