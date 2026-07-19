import { Inject, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, type Namespace, Socket } from 'socket.io';
import { TOKEN_VERIFIER, type TokenVerifier } from '../domain/security/token-verifier';
import { TokenRole, type TokenClaims } from '../domain/security/token-issuer';
import type { ParticipantRole } from '../domain/participant/participant.entity';
import { classifyTextPayload } from '../domain/transfer/text-payload';
import {
  TRANSFER_REPOSITORY,
  type TransferRepository,
} from '../domain/transfer/transfer.repository';
import { sendTextSchema } from '../transfer/dto/text-payload.dto';
import {
  TransferEvent,
  type TransferTextPayload,
  type TransferTextAck,
} from '../transfer/transfer-events';
import { hashRoomToken } from '../infrastructure/security/token-hash';
import { RoomPresenceService } from './room-presence.service';
import { RoomEvent } from './room-events';
import type { RoomBroadcaster } from './room-broadcaster';

interface ConnectedParticipant {
  participantId: string;
  roomId: string;
  role: ParticipantRole;
}

// CORS for the underlying Socket.io server is configured by ConfigurableIoAdapter
// at bootstrap, not here — decorator options evaluate at import, before config loads.
@WebSocketGateway()
export class RoomGateway implements OnGatewayConnection, RoomBroadcaster {
  @WebSocketServer() private readonly server!: Server;

  private readonly logger = new Logger(RoomGateway.name);
  private readonly connected = new Map<string, ConnectedParticipant>();

  constructor(
    @Inject(TOKEN_VERIFIER) private readonly tokenVerifier: TokenVerifier,
    @Inject(TRANSFER_REPOSITORY) private readonly transfers: TransferRepository,
    private readonly presence: RoomPresenceService,
  ) {}

  emitToRoom(roomId: string, event: string, payload: unknown): void {
    this.server.to(roomId).emit(event, payload);
  }

  // The Sender submits a Text Snippet / Link; the server classifies it, persists
  // it, then broadcasts to the rest of the Room. Persistence comes first so the
  // Transfer Log can hydrate it on reload/late-join — the transferId is the
  // persisted row's id, shared by the ack and the broadcast so both sides key on
  // the same value. The ack returns that id (or a reason) to the emitting client.
  @SubscribeMessage(TransferEvent.SendText)
  async handleSendText(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<TransferTextAck> {
    const info = this.connected.get(socket.id);
    if (!info || info.role !== 'SENDER') {
      return { error: 'Only the Sender may send text' };
    }
    const parsed = sendTextSchema.safeParse(body);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid text payload' };
    }
    const { payloadType, content } = classifyTextPayload(parsed.data.text);

    let transferId: string;
    try {
      transferId = await this.persistText(info.roomId, payloadType, content);
    } catch (err) {
      this.logger.error(`Failed to persist text transfer for Room ${info.roomId}`, err);
      return { error: 'Could not send — try again' };
    }

    const payload: TransferTextPayload = { transferId, payloadType, content };
    // `socket.to` excludes the Sender — they already have it and get the ack.
    socket.to(info.roomId).emit(TransferEvent.Text, payload);
    return { transferId };
  }

  private async persistText(
    roomId: string,
    payloadType: TransferTextPayload['payloadType'],
    content: string,
  ): Promise<string> {
    const transfer = await this.transfers.create({
      roomId,
      payloadType,
      contentLength: BigInt(Buffer.byteLength(content, 'utf8')),
    });
    await this.transfers.createTextPayload({ transferId: transfer.id, content });
    return transfer.id;
  }

  async handleConnection(socket: Socket): Promise<void> {
    let auth: { token: string; claims: TokenClaims };
    try {
      auth = this.authenticate(socket);
    } catch {
      socket.disconnect(true);
      return;
    }
    await this.onParticipantJoined(socket, auth.token, auth.claims);
  }

  private authenticate(socket: Socket): { token: string; claims: TokenClaims } {
    const token = socket.handshake.auth['token'] as string | undefined;
    if (!token) throw new Error('no token');
    return { token, claims: this.tokenVerifier.verify(token) };
  }

  private async onParticipantJoined(
    socket: Socket,
    token: string,
    claims: TokenClaims,
  ): Promise<void> {
    const { roomId, role } = claims;
    const participantRole = toParticipantRole(role);

    // 'disconnecting' fires while the socket is still in its rooms — before
    // Socket.io calls leaveAll(). Register it before the awaits below so a socket
    // that drops mid-join is still cleaned up, and cache nsp so the async cleanup
    // can broadcast to the room after leaveAll() completes. onParticipantLeft
    // keys off `connected`, so it safely no-ops until the join is recorded.
    const nsp: Namespace = socket.nsp;
    socket.on('disconnecting', () => void this.onParticipantLeft(nsp, socket.id));

    let participantId: string;
    let receiverCount: number;
    try {
      ({ participantId, receiverCount } = await this.presence.recordJoin({
        roomId,
        role: participantRole,
        tokenHash: hashRoomToken(token),
      }));
      await socket.join(roomId);
    } catch (err) {
      this.logger.error(`Failed to record join for Room ${roomId}`, err);
      socket.disconnect(true);
      return;
    }

    this.connected.set(socket.id, { participantId, roomId, role: participantRole });

    if (participantRole === 'RECEIVER') {
      this.server.to(roomId).emit(RoomEvent.Joined, { receiverCount });
    }

    // If the socket dropped during the awaits above, its 'disconnecting' already
    // fired while `connected` had no entry — reconcile now so the join isn't
    // orphaned with the Participant left marked connected forever.
    if (socket.disconnected) {
      void this.onParticipantLeft(nsp, socket.id);
    }
  }

  private async onParticipantLeft(nsp: Namespace, socketId: string): Promise<void> {
    const info = this.connected.get(socketId);
    if (!info) return;

    this.connected.delete(socketId);

    let receiverCount: number;
    try {
      ({ receiverCount } = await this.presence.recordLeave({
        participantId: info.participantId,
        roomId: info.roomId,
      }));
    } catch (err) {
      this.logger.error(`Failed to record leave for Participant ${info.participantId}`, err);
      return;
    }

    if (info.role === 'RECEIVER') {
      nsp.to(info.roomId).emit(RoomEvent.Left, { receiverCount });
    }
  }
}

function toParticipantRole(role: TokenRole): ParticipantRole {
  return role === TokenRole.Sender ? 'SENDER' : 'RECEIVER';
}
