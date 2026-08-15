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
import type { ParticipantIdentity } from '../domain/participant/participant-identity';
import { RoomPresenceService } from './room-presence.service';
import { RoomService } from './room.service';
import {
  RoomEvent,
  type RoomCloseAck,
  type RoomRenameAck,
  type RoomTypingPayload,
} from './room-events';
import { renameSchema } from './dto/rename.dto';
import { typingSchema } from './dto/typing.dto';
import type { RoomBroadcaster } from './room-broadcaster';

interface ConnectedParticipant {
  participantId: string;
  roomId: string;
  role: ParticipantRole;
  // The stable key behind this identity — updates to the name fan out across every
  // connection row sharing it.
  tokenHash: string;
  // Held live so each broadcast Transfer carries the author's current identity
  // without a per-message lookup; a rename mutates it in place.
  identity: ParticipantIdentity;
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
    private readonly roomService: RoomService,
  ) {}

  emitToRoom(roomId: string, event: string, payload: unknown): void {
    this.server.to(roomId).emit(event, payload);
  }

  // Any Participant submits a Text Snippet / Link; the server classifies it,
  // persists it with its author, then broadcasts to the rest of the Room.
  // Persistence comes first so the stream can hydrate it on reload/late-join —
  // the transferId is the persisted row's id, shared by the ack and the broadcast
  // so both sides key on the same value. The ack returns the classified row to
  // the author (their own send is never broadcast back to them).
  @SubscribeMessage(TransferEvent.SendText)
  async handleSendText(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<TransferTextAck> {
    const info = this.connected.get(socket.id);
    if (!info) return { error: 'Join the Room before sending' };

    const parsed = sendTextSchema.safeParse(body);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid text payload' };
    }
    const { payloadType, content } = classifyTextPayload(parsed.data.text);

    let transferId: string;
    try {
      transferId = await this.persistText(info, payloadType, content);
    } catch (err) {
      this.logger.error(`Failed to persist text transfer for Room ${info.roomId}`, err);
      return { error: 'Could not send — try again' };
    }

    const payload: TransferTextPayload = {
      transferId,
      payloadType,
      content,
      author: { role: info.role, identity: info.identity },
    };
    // `socket.to` excludes the author — they already have it and get the ack.
    socket.to(info.roomId).emit(TransferEvent.Text, payload);
    return { transferId, payloadType, content };
  }

  private async persistText(
    author: ConnectedParticipant,
    payloadType: TransferTextPayload['payloadType'],
    content: string,
  ): Promise<string> {
    // One atomic write — a half-failure can't leave a Transfer row without its
    // TextPayload, which the Log would otherwise hydrate as an empty ghost row.
    const transfer = await this.transfers.createTextTransfer({
      roomId: author.roomId,
      payloadType,
      content,
      contentLength: BigInt(Buffer.byteLength(content, 'utf8')),
      authorParticipantId: author.participantId,
    });
    return transfer.id;
  }

  // Any Participant edits their own display name. Persisted across every
  // connection row of the identity, mirrored onto this socket's live identity so
  // subsequent Transfers carry it, then broadcast so peers re-label the messages
  // already attributed to this identity. A blank name reverts to the auto name.
  @SubscribeMessage(RoomEvent.Rename)
  async handleRename(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<RoomRenameAck> {
    const info = this.connected.get(socket.id);
    if (!info) return { error: 'Join the Room before renaming' };

    const parsed = renameSchema.safeParse(body);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid name' };
    }

    let identity: ParticipantIdentity;
    try {
      identity = await this.presence.rename({
        roomId: info.roomId,
        tokenHash: info.tokenHash,
        displayName: parsed.data.name,
      });
    } catch (err) {
      this.logger.error(`Failed to rename Participant in Room ${info.roomId}`, err);
      return { error: 'Could not save your name — try again' };
    }

    info.identity = identity;
    this.server.to(info.roomId).emit(RoomEvent.Identity, identity);
    return { identity };
  }

  // A Participant started or stopped composing. This is a pure ephemeral relay:
  // no repository write, nothing in the Transfer Log — it's fanned out to the rest
  // of the Room and forgotten. The client is trusted only for the boolean; the
  // identity comes from the socket's own record so the indicator can't be spoofed.
  // `socket.to` excludes the author — they don't get an indicator for their own
  // typing. A dropped stop is backstopped by a client-side timeout on each peer.
  @SubscribeMessage(RoomEvent.Typing)
  handleTyping(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown): void {
    const info = this.connected.get(socket.id);
    if (!info) return;

    const parsed = typingSchema.safeParse(body);
    if (!parsed.success) return;

    const payload: RoomTypingPayload = { identity: info.identity, typing: parsed.data.typing };
    socket.to(info.roomId).emit(RoomEvent.TypingState, payload);
  }

  // The Sender ends the Room: purge its Transfers, mark it CLOSED, then evict
  // everyone. The `room:closed` event goes out before the disconnect so each
  // Participant can show a terminal state instead of a bare "connection lost".
  @SubscribeMessage(RoomEvent.Close)
  async handleCloseRoom(@ConnectedSocket() socket: Socket): Promise<RoomCloseAck> {
    const info = this.connected.get(socket.id);
    if (!info || info.role !== 'SENDER') {
      return { error: 'Only the Sender may close the Room' };
    }
    try {
      await this.roomService.close(info.roomId);
    } catch (err) {
      this.logger.error(`Failed to close Room ${info.roomId}`, err);
      return { error: 'Could not close the Room — try again' };
    }
    // Notify and evict every *other* Participant. The initiating Sender is left
    // connected so this ack still reaches it — its client disconnects as it
    // navigates away. `socket.to` scopes both the event and the kick to the rest
    // of the Room.
    socket.to(info.roomId).emit(RoomEvent.Closed, {});
    const others = await socket.to(info.roomId).fetchSockets();
    for (const other of others) other.disconnect(true);
    return { ok: true };
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

    const tokenHash = hashRoomToken(token);
    let participantId: string;
    let receiverCount: number;
    let identity: ParticipantIdentity;
    try {
      ({ participantId, receiverCount, identity } = await this.presence.recordJoin({
        roomId,
        role: participantRole,
        tokenHash,
      }));
      await socket.join(roomId);
    } catch (err) {
      this.logger.error(`Failed to record join for Room ${roomId}`, err);
      socket.disconnect(true);
      return;
    }

    // Read presence before recording this connection so the roster broadcast can
    // tell a genuinely new arrival (announce it) from a second tab of someone
    // already here (stay silent).
    const firstConnection = !this.isPresent(roomId, identity.key);

    this.connected.set(socket.id, {
      participantId,
      roomId,
      role: participantRole,
      tokenHash,
      identity,
    });

    // Tell the joiner who they are so the UI can show it and offer a rename.
    socket.emit(RoomEvent.IdentitySelf, identity);

    if (participantRole === 'RECEIVER') {
      this.server.to(roomId).emit(RoomEvent.Joined, { receiverCount });
    }

    // Roster covers every role — the cluster shows the Sender too — so it fires on
    // any join, alongside (not folded into) the receiver-count event above.
    this.server.to(roomId).emit(RoomEvent.Roster, {
      roster: this.rosterFor(roomId),
      ...(firstConnection ? { joined: identity } : {}),
    });

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

    // `connected` was already pruned above, so a lingering connection means this
    // person still has another tab open — announce the departure only when their
    // last one drops.
    const stillPresent = this.isPresent(info.roomId, info.identity.key);
    nsp.to(info.roomId).emit(RoomEvent.Roster, {
      roster: this.rosterFor(info.roomId),
      ...(stillPresent ? {} : { left: info.identity }),
    });
  }

  // The present Participants of a Room, one entry per identity — a person with two
  // tabs is one avatar in the cluster. Sourced from the live connection map (a
  // single api instance owns every socket), so it needs no round-trip.
  private rosterFor(roomId: string): ParticipantIdentity[] {
    const byKey = new Map<string, ParticipantIdentity>();
    for (const info of this.connected.values()) {
      if (info.roomId === roomId) byKey.set(info.identity.key, info.identity);
    }
    return [...byKey.values()];
  }

  private isPresent(roomId: string, identityKey: string): boolean {
    for (const info of this.connected.values()) {
      if (info.roomId === roomId && info.identity.key === identityKey) return true;
    }
    return false;
  }
}

function toParticipantRole(role: TokenRole): ParticipantRole {
  return role === TokenRole.Sender ? 'SENDER' : 'RECEIVER';
}
