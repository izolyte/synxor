import { createHash } from 'crypto';
import { Inject, Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { Server, type Namespace, Socket } from 'socket.io';
import { TOKEN_VERIFIER, type TokenVerifier } from '../domain/security/token-verifier';
import { TokenRole, type TokenClaims } from '../domain/security/token-issuer';
import {
  PARTICIPANT_REPOSITORY,
  type ParticipantRepository,
} from '../domain/participant/participant.repository';
import type { ParticipantRole } from '../domain/participant/participant.entity';

interface ConnectedParticipant {
  participantId: string;
  roomId: string;
  role: ParticipantRole;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class RoomGateway implements OnGatewayConnection {
  @WebSocketServer() private readonly server!: Server;

  private readonly logger = new Logger(RoomGateway.name);
  private readonly connected = new Map<string, ConnectedParticipant>();

  constructor(
    @Inject(TOKEN_VERIFIER) private readonly tokenVerifier: TokenVerifier,
    @Inject(PARTICIPANT_REPOSITORY) private readonly participants: ParticipantRepository,
  ) {}

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

    const participant = await this.participants.create({
      roomId,
      role: participantRole,
      tokenHash: hashToken(token),
    });

    await socket.join(roomId);
    this.connected.set(socket.id, { participantId: participant.id, roomId, role: participantRole });

    if (participantRole === 'RECEIVER') {
      const receiverCount = await this.participants.countConnected(roomId, 'RECEIVER');
      this.server.to(roomId).emit('room:joined', { receiverCount });
    }

    // 'disconnecting' fires while the socket is still in its rooms — before
    // Socket.io calls leaveAll(). Cache nsp so async cleanup can still broadcast
    // to the room after leaveAll() completes.
    const nsp: Namespace = socket.nsp;
    socket.on('disconnecting', () => void this.onParticipantLeft(nsp, socket.id));
  }

  private async onParticipantLeft(nsp: Namespace, socketId: string): Promise<void> {
    const info = this.connected.get(socketId);
    if (!info) return;

    this.connected.delete(socketId);

    try {
      await this.participants.setDisconnected(info.participantId, new Date());
    } catch (err) {
      this.logger.error(`Failed to mark Participant ${info.participantId} disconnected`, err);
    }

    if (info.role === 'RECEIVER') {
      const receiverCount = await this.participants.countConnected(info.roomId, 'RECEIVER');
      nsp.to(info.roomId).emit('room:left', { receiverCount });
    }
  }
}

function toParticipantRole(role: TokenRole): ParticipantRole {
  return role === TokenRole.Sender ? 'SENDER' : 'RECEIVER';
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
