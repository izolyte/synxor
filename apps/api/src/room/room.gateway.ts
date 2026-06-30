import { Inject, Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { Server, type Namespace, Socket } from 'socket.io';
import { TOKEN_VERIFIER, type TokenVerifier } from '../domain/security/token-verifier';
import { TokenRole, type TokenClaims } from '../domain/security/token-issuer';
import type { ParticipantRole } from '../domain/participant/participant.entity';
import { hashRoomToken } from '../infrastructure/security/token-hash';
import { RoomPresenceService } from './room-presence.service';
import { RoomEvent } from './room-events';

interface ConnectedParticipant {
  participantId: string;
  roomId: string;
  role: ParticipantRole;
}

// CORS for the underlying Socket.io server is configured by ConfigurableIoAdapter
// at bootstrap, not here — decorator options evaluate at import, before config loads.
@WebSocketGateway()
export class RoomGateway implements OnGatewayConnection {
  @WebSocketServer() private readonly server!: Server;

  private readonly logger = new Logger(RoomGateway.name);
  private readonly connected = new Map<string, ConnectedParticipant>();

  constructor(
    @Inject(TOKEN_VERIFIER) private readonly tokenVerifier: TokenVerifier,
    private readonly presence: RoomPresenceService,
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

    const { participantId, receiverCount } = await this.presence.recordJoin({
      roomId,
      role: participantRole,
      tokenHash: hashRoomToken(token),
    });

    await socket.join(roomId);
    this.connected.set(socket.id, { participantId, roomId, role: participantRole });

    if (participantRole === 'RECEIVER') {
      this.server.to(roomId).emit(RoomEvent.Joined, { receiverCount });
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
