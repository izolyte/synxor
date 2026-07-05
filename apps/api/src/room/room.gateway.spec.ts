import { type Server } from 'http';
import { type AddressInfo } from 'net';
import { type INestApplication, Logger } from '@nestjs/common';
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
  const { port } = (app.getHttpServer() as Server).address() as AddressInfo;
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
    await expect(Promise.race([joined, Promise.resolve('pending')])).resolves.toBe('pending');
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

  it('emits room:left with the remaining count when one of several Receivers leaves', async () => {
    fakeVerifier.register('sender-tok', { roomId: 'room-1', role: TokenRole.Sender });
    fakeVerifier.register('rx1-tok', { roomId: 'room-1', role: TokenRole.Receiver });
    fakeVerifier.register('rx2-tok', { roomId: 'room-1', role: TokenRole.Receiver });

    const sender = open('sender-tok');
    await waitFor(sender, 'connect');

    const rx1 = open('rx1-tok');
    await waitFor(sender, 'room:joined');

    const secondJoined = waitFor(sender, 'room:joined');
    open('rx2-tok');
    await secondJoined;

    const left = waitFor(sender, 'room:left');
    rx1.disconnect();

    expect(await left).toEqual({ receiverCount: 1 });
  });

  it('does not emit room:left when the Sender disconnects', async () => {
    fakeVerifier.register('sender-tok', { roomId: 'room-1', role: TokenRole.Sender });
    fakeVerifier.register('receiver-tok', { roomId: 'room-1', role: TokenRole.Receiver });

    const sender = open('sender-tok');
    await waitFor(sender, 'connect');

    const joined = waitFor(sender, 'room:joined');
    const receiver = open('receiver-tok');
    await joined;

    // The Receiver watches for room:left; the Sender leaving must not trigger it.
    const left = waitFor(receiver, 'room:left');
    sender.disconnect();
    await new Promise((r) => setTimeout(r, 50));

    await expect(Promise.race([left, Promise.resolve('none')])).resolves.toBe('none');
    expect(receiver.connected).toBe(true);
  });

  // ── Room isolation ────────────────────────────────────────────────────────

  it('does not leak room:joined to a Sender watching a different room', async () => {
    fakeVerifier.register('sender-a', { roomId: 'room-A', role: TokenRole.Sender });
    fakeVerifier.register('sender-b', { roomId: 'room-B', role: TokenRole.Sender });
    fakeVerifier.register('rx-a', { roomId: 'room-A', role: TokenRole.Receiver });

    const senderA = open('sender-a');
    await waitFor(senderA, 'connect');
    const senderB = open('sender-b');
    await waitFor(senderB, 'connect');

    const aJoined = waitFor(senderA, 'room:joined');
    const bJoined = waitFor(senderB, 'room:joined');
    open('rx-a');

    // room-A's Sender is notified; room-B's Sender hears nothing.
    expect(await aJoined).toEqual({ receiverCount: 1 });
    await expect(Promise.race([bJoined, Promise.resolve('none')])).resolves.toBe('none');
  });

  // ── Broadcasting ──────────────────────────────────────────────────────────

  it('emitToRoom reaches every socket in the room and nobody outside it', async () => {
    fakeVerifier.register('sender-tok', { roomId: 'room-1', role: TokenRole.Sender });
    fakeVerifier.register('receiver-tok', { roomId: 'room-1', role: TokenRole.Receiver });
    fakeVerifier.register('outsider-tok', { roomId: 'room-2', role: TokenRole.Sender });

    const sender = open('sender-tok');
    await waitFor(sender, 'connect');
    const outsider = open('outsider-tok');
    await waitFor(outsider, 'connect');
    const receiver = open('receiver-tok');
    await waitFor(sender, 'room:joined'); // proves both room-1 joins completed

    const senderGot = waitFor(sender, 'transfer:progress');
    const receiverGot = waitFor(receiver, 'transfer:progress');
    const outsiderGot = waitFor(outsider, 'transfer:progress');

    app.get(RoomGateway).emitToRoom('room-1', 'transfer:progress', { receivedChunks: 1 });

    expect(await senderGot).toEqual({ receivedChunks: 1 });
    expect(await receiverGot).toEqual({ receivedChunks: 1 });
    await new Promise((r) => setTimeout(r, 50));
    await expect(Promise.race([outsiderGot, Promise.resolve('none')])).resolves.toBe('none');
  });

  // ── Resilience ──────────────────────────────────────────────────────────────

  it('keeps the connection alive and emits no room:left when recording the leave fails', async () => {
    class FailingRepo extends InMemoryParticipantRepository {
      setDisconnected(): Promise<never> {
        return Promise.reject(new Error('db unavailable'));
      }
    }
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const verifier = new FakeTokenVerifier();
    verifier.register('sender-tok', { roomId: 'room-1', role: TokenRole.Sender });
    verifier.register('receiver-tok', { roomId: 'room-1', role: TokenRole.Receiver });

    const ctx = await startApp(verifier, new FailingRepo());
    try {
      const sender = connect(ctx.port, 'sender-tok');
      sockets.push(sender);
      sender.connect();
      await waitFor(sender, 'connect');

      const receiver = connect(ctx.port, 'receiver-tok');
      sockets.push(receiver);
      receiver.connect();
      await waitFor(sender, 'room:joined');

      const left = waitFor(sender, 'room:left');
      receiver.disconnect();
      await new Promise((r) => setTimeout(r, 50));

      await expect(Promise.race([left, Promise.resolve('none')])).resolves.toBe('none');
      expect(sender.connected).toBe(true);
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      await ctx.app.close();
      errorSpy.mockRestore();
    }
  });

  // ── Text Snippet / Link transfer ─────────────────────────────────────────────

  function sendText(socket: Socket, text: string): Promise<unknown> {
    return new Promise((resolve) => socket.emit('transfer:text:send', { text }, resolve));
  }

  it('classifies a URL as a Link and broadcasts it to the Receiver', async () => {
    fakeVerifier.register('sender-tok', { roomId: 'room-1', role: TokenRole.Sender });
    fakeVerifier.register('receiver-tok', { roomId: 'room-1', role: TokenRole.Receiver });

    const sender = open('sender-tok');
    await waitFor(sender, 'connect');
    const receiver = open('receiver-tok');
    await waitFor(sender, 'room:joined');

    const received = waitFor(receiver, 'transfer:text');
    const ack = (await sendText(sender, '  https://example.com/x  ')) as { transferId: string };

    const payload = (await received) as {
      transferId: string;
      payloadType: string;
      content: string;
    };
    expect(payload).toEqual({
      transferId: ack.transferId,
      payloadType: 'LINK',
      content: 'https://example.com/x',
    });
  });

  it('classifies plain text as a Text Snippet', async () => {
    fakeVerifier.register('sender-tok', { roomId: 'room-1', role: TokenRole.Sender });
    fakeVerifier.register('receiver-tok', { roomId: 'room-1', role: TokenRole.Receiver });

    const sender = open('sender-tok');
    await waitFor(sender, 'connect');
    const receiver = open('receiver-tok');
    await waitFor(sender, 'room:joined');

    const received = waitFor(receiver, 'transfer:text');
    await sendText(sender, 'just some notes');

    expect((await received) as { payloadType: string }).toMatchObject({
      payloadType: 'TEXT_SNIPPET',
      content: 'just some notes',
    });
  });

  it('does not echo the Text back to the Sender who sent it', async () => {
    fakeVerifier.register('sender-tok', { roomId: 'room-1', role: TokenRole.Sender });
    fakeVerifier.register('receiver-tok', { roomId: 'room-1', role: TokenRole.Receiver });

    const sender = open('sender-tok');
    await waitFor(sender, 'connect');
    open('receiver-tok');
    await waitFor(sender, 'room:joined');

    const echoed = waitFor(sender, 'transfer:text');
    await sendText(sender, 'https://example.com');
    await new Promise((r) => setTimeout(r, 50));

    await expect(Promise.race([echoed, Promise.resolve('none')])).resolves.toBe('none');
  });

  it('rejects a Receiver trying to send text and broadcasts nothing', async () => {
    fakeVerifier.register('sender-tok', { roomId: 'room-1', role: TokenRole.Sender });
    fakeVerifier.register('receiver-tok', { roomId: 'room-1', role: TokenRole.Receiver });

    const sender = open('sender-tok');
    await waitFor(sender, 'connect');
    const receiver = open('receiver-tok');
    await waitFor(sender, 'room:joined');

    const senderGot = waitFor(sender, 'transfer:text');
    const ack = (await sendText(receiver, 'https://example.com')) as { error: string };

    expect(ack.error).toBe('Only the Sender may send text');
    await new Promise((r) => setTimeout(r, 50));
    await expect(Promise.race([senderGot, Promise.resolve('none')])).resolves.toBe('none');
  });

  it('rejects text over the character limit', async () => {
    fakeVerifier.register('sender-tok', { roomId: 'room-1', role: TokenRole.Sender });
    const sender = open('sender-tok');
    await waitFor(sender, 'connect');

    const ack = (await sendText(sender, 'a'.repeat(100_001))) as { error: string };
    expect(ack.error).toMatch(/character limit/);
  });
});
