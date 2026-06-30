import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { io, type Socket } from 'socket.io-client';
import { RoomGateway } from './room.gateway';
import { RoomPresenceService } from './room-presence.service';
import { PARTICIPANT_REPOSITORY } from '../domain/participant/participant.repository';
import { TOKEN_VERIFIER } from '../domain/security/token-verifier';
import { TokenRole, type TokenClaims } from '../domain/security/token-issuer';
import { InMemoryParticipantRepository } from '../domain/participant/participant.repository.fake';

// Controls what claims are returned per token string — no real JWT needed.
class FakeTokenVerifier {
  private readonly map = new Map<string, TokenClaims>();

  register(token: string, claims: TokenClaims): void {
    this.map.set(token, claims);
  }

  verify(token: string): TokenClaims {
    const claims = this.map.get(token);
    if (!claims) throw new Error(`FakeTokenVerifier: unknown token "${token}"`);
    return claims;
  }
}

function connect(port: number, token?: string): Socket {
  return io(`http://localhost:${port}`, {
    auth: token ? { token } : {},
    autoConnect: false,
    reconnection: false,
    transports: ['websocket'],
  });
}

function waitFor(socket: Socket, event: string): Promise<unknown> {
  return new Promise((resolve) => socket.once(event, resolve));
}

function waitForDisconnect(socket: Socket): Promise<string> {
  return new Promise((resolve) => socket.once('disconnect', resolve));
}

async function startApp(
  fakeVerifier: FakeTokenVerifier,
  fakeParticipants: InMemoryParticipantRepository,
): Promise<{ app: INestApplication; port: number }> {
  const module = await Test.createTestingModule({
    providers: [
      RoomGateway,
      RoomPresenceService,
      { provide: TOKEN_VERIFIER, useValue: fakeVerifier },
      { provide: PARTICIPANT_REPOSITORY, useValue: fakeParticipants },
    ],
  }).compile();

  const app = module.createNestApplication();
  app.useWebSocketAdapter(new IoAdapter(app));
  await app.listen(0); // OS-assigned port
  const port = (app.getHttpServer().address() as { port: number }).port;
  return { app, port };
}

describe('RoomGateway', () => {
  let app: INestApplication;
  let port: number;
  let fakeVerifier: FakeTokenVerifier;
  let fakeParticipants: InMemoryParticipantRepository;
  const sockets: Socket[] = [];

  beforeEach(async () => {
    fakeVerifier = new FakeTokenVerifier();
    fakeParticipants = new InMemoryParticipantRepository();
    ({ app, port } = await startApp(fakeVerifier, fakeParticipants));
  });

  afterEach(async () => {
    for (const s of sockets.splice(0)) s.disconnect();
    await app.close();
  });

  function open(token?: string): Socket {
    const s = connect(port, token);
    sockets.push(s);
    s.connect();
    return s;
  }

  // ── Auth ─────────────────────────────────────────────────────────────────

  it('disconnects a socket that carries no token', async () => {
    const socket = open();
    await waitForDisconnect(socket);
    expect(socket.connected).toBe(false);
  });

  it('disconnects a socket that carries an invalid token', async () => {
    const socket = open('bad-token');
    await waitForDisconnect(socket);
    expect(socket.connected).toBe(false);
  });

  // ── Sender connects ───────────────────────────────────────────────────────

  it('accepts a Sender and does not emit room:joined', async () => {
    fakeVerifier.register('sender-tok', { roomId: 'room-1', role: TokenRole.Sender });
    const socket = open('sender-tok');

    const joined = waitFor(socket, 'room:joined');
    await waitFor(socket, 'connect');

    // Give the gateway a tick to emit anything it would emit.
    await new Promise((r) => setTimeout(r, 20));

    // Should still be pending — no room:joined for Senders.
    expect(Promise.race([joined, Promise.resolve('pending')])).resolves.toBe('pending');
    expect(socket.connected).toBe(true);
  });

  // ── Receiver connects → room:joined ──────────────────────────────────────

  it('emits room:joined to the room when a Receiver connects', async () => {
    fakeVerifier.register('sender-tok', { roomId: 'room-1', role: TokenRole.Sender });
    fakeVerifier.register('receiver-tok', { roomId: 'room-1', role: TokenRole.Receiver });

    const sender = open('sender-tok');
    await waitFor(sender, 'connect');

    const joined = waitFor(sender, 'room:joined');

    const receiver = open('receiver-tok');
    await waitFor(receiver, 'connect');

    const payload = await joined;
    expect(payload).toEqual({ receiverCount: 1 });
  });

  it('includes the correct receiver count when multiple Receivers are connected', async () => {
    fakeVerifier.register('sender-tok', { roomId: 'room-1', role: TokenRole.Sender });
    fakeVerifier.register('rx1-tok', { roomId: 'room-1', role: TokenRole.Receiver });
    fakeVerifier.register('rx2-tok', { roomId: 'room-1', role: TokenRole.Receiver });

    const sender = open('sender-tok');
    await waitFor(sender, 'connect');

    open('rx1-tok');
    const firstJoined = waitFor(sender, 'room:joined');
    await firstJoined;

    const secondJoined = waitFor(sender, 'room:joined');
    open('rx2-tok');
    const payload = await secondJoined;

    expect(payload).toEqual({ receiverCount: 2 });
  });

  // ── Receiver disconnects → room:left ─────────────────────────────────────

  it('emits room:left to the room when a Receiver disconnects', async () => {
    fakeVerifier.register('sender-tok', { roomId: 'room-1', role: TokenRole.Sender });
    fakeVerifier.register('receiver-tok', { roomId: 'room-1', role: TokenRole.Receiver });

    const sender = open('sender-tok');
    await waitFor(sender, 'connect');

    const receiver = open('receiver-tok');
    await waitFor(receiver, 'connect');
    await waitFor(sender, 'room:joined');

    const left = waitFor(sender, 'room:left');
    receiver.disconnect();

    const payload = await left;
    expect(payload).toEqual({ receiverCount: 0 });
  });
});
