import { Inject, Injectable, Logger } from '@nestjs/common';
import { ROOM_REPOSITORY, type RoomRepository } from '../domain/room/room.repository';
import {
  RoomCodeCollisionError,
  RoomCodeExhaustionError,
  RoomExpiredError,
  RoomNotFoundError,
} from '../domain/room/room.errors';
import type { Room } from '../domain/room/room.entity';
import { isExpired } from '../domain/room/room-status';
import {
  TRANSFER_REPOSITORY,
  type TransferRepository,
} from '../domain/transfer/transfer.repository';
import {
  DELIVERY_REPOSITORY,
  type DeliveryRepository,
} from '../domain/delivery/delivery.repository';
import type { CreateRoomResult } from './dto/create-room.dto';
import type { JoinRoomResult } from './dto/join-room.dto';
import type { RoomTransfersResult } from './dto/room-transfers.dto';
import { ROOM_CODE_MAX_ATTEMPTS } from '../domain/room/room-code';
import { type Expiry, resolveExpiresAt } from '../domain/room/room-expiry';
import { CODE_GENERATOR, type CodeGenerator } from '../domain/security/code-generator';
import { TOKEN_ISSUER, TokenRole, type TokenIssuer } from '../domain/security/token-issuer';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: RoomRepository,
    @Inject(CODE_GENERATOR) private readonly codeGen: CodeGenerator,
    @Inject(TOKEN_ISSUER) private readonly tokenIssuer: TokenIssuer,
    @Inject(TRANSFER_REPOSITORY) private readonly transfers: TransferRepository,
    @Inject(DELIVERY_REPOSITORY) private readonly deliveries: DeliveryRepository,
  ) {}

  async create(expiry: Expiry): Promise<CreateRoomResult> {
    const expiresAt = resolveExpiresAt(expiry);
    const room = await this.createRoomWithUniqueCode(expiresAt);

    try {
      const roomToken = this.tokenIssuer.sign(
        { roomId: room.id, role: TokenRole.Sender },
        expiresAt,
      );
      return { roomCode: room.code, roomToken, expiresAt: room.expiresAt.toISOString() };
    } catch (err) {
      // Token signing failed after persistence — drop the orphan so a retry
      // doesn't leave an unreachable Room sitting until Expiry. Surface a cleanup
      // failure rather than swallowing it, so orphans stay observable.
      await this.rooms.delete(room.id).catch((cleanupErr) => {
        this.logger.error(
          `Failed to delete orphaned Room ${room.id} after token signing failed`,
          cleanupErr instanceof Error ? cleanupErr.stack : String(cleanupErr),
        );
      });
      throw err;
    }
  }

  async join(roomCode: string): Promise<JoinRoomResult> {
    const room = await this.rooms.findByCode(roomCode);
    if (!room) throw new RoomNotFoundError(roomCode);
    if (isExpired(room)) throw new RoomExpiredError(roomCode);

    const roomToken = this.tokenIssuer.sign(
      { roomId: room.id, role: TokenRole.Receiver },
      room.expiresAt,
    );
    return { roomToken, roomId: room.id };
  }

  // The Transfer Log's persistent history: every Transfer recorded for the Room,
  // oldest first. Only file uploads persist today (text/link Transfers are
  // socket-only), so file metadata comes from the FilePayload and "delivered" is
  // the existence of a Delivery row — there's no persisted status column. The
  // live socket feed refines in-flight rows on top of this snapshot.
  async listTransfers(roomCode: string): Promise<RoomTransfersResult> {
    const room = await this.rooms.findByCode(roomCode);
    if (!room) throw new RoomNotFoundError(roomCode);

    const transfers = await this.transfers.findByRoomId(room.id);
    const transferIds = transfers.map((t) => t.id);

    // Two batched reads instead of a round-trip pair per Transfer — the Log grows
    // with the Room, so N+1 here scales with session length.
    const [filePayloads, deliveries] = await Promise.all([
      this.transfers.findFilePayloadsByTransferIds(transferIds),
      this.deliveries.findByTransferIds(transferIds),
    ]);
    const filePayloadByTransferId = new Map(filePayloads.map((fp) => [fp.transferId, fp]));
    const deliveredTransferIds = new Set(deliveries.map((d) => d.transferId));

    return transfers.map((transfer) => {
      const filePayload = filePayloadByTransferId.get(transfer.id) ?? null;
      return {
        id: transfer.id,
        payloadType: transfer.payloadType,
        fileName: filePayload?.fileName ?? null,
        // bigint → number for the transformer-less JSON wire; file sizes stay
        // well under Number.MAX_SAFE_INTEGER (the upload cap is far below it).
        fileSizeBytes: filePayload ? Number(filePayload.fileSizeBytes) : null,
        delivered: deliveredTransferIds.has(transfer.id),
        createdAt: transfer.createdAt.toISOString(),
      };
    });
  }

  // Lets the DB's unique constraint on Room.code arbitrate collisions, rather
  // than a racy read-then-write, then retries on the resulting domain error.
  private async createRoomWithUniqueCode(expiresAt: Date): Promise<Room> {
    for (let attempt = 0; attempt < ROOM_CODE_MAX_ATTEMPTS; attempt++) {
      try {
        return await this.rooms.create({ code: this.codeGen.generate(), expiresAt });
      } catch (err) {
        if (err instanceof RoomCodeCollisionError) continue;
        throw err;
      }
    }
    throw new RoomCodeExhaustionError(ROOM_CODE_MAX_ATTEMPTS);
  }
}
