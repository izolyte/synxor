import { Inject, Injectable } from '@nestjs/common';
import {
  DELIVERY_REPOSITORY,
  type DeliveryRepository,
} from '../domain/delivery/delivery.repository';
import { DuplicateDeliveryError } from '../domain/delivery/delivery.errors';
import { ROOM_BROADCASTER, type RoomBroadcaster } from '../room/room-broadcaster';
import { TransferEvent, type TransferDeliveredPayload } from './transfer-events';

// Records that a Receiver finished pulling a transfer and announces it to the
// Room, so the Sender's row can flip to Delivered. Owns the transfer:delivered
// wire payload — same contract-in-one-place rule as TransferProgressNotifier.
@Injectable()
export class TransferDeliveryService {
  constructor(
    @Inject(DELIVERY_REPOSITORY) private readonly deliveries: DeliveryRepository,
    @Inject(ROOM_BROADCASTER) private readonly broadcaster: RoomBroadcaster,
  ) {}

  async confirmDelivered(transferId: string, roomId: string): Promise<void> {
    try {
      await this.deliveries.create({ transferId, deliveredAt: new Date() });
    } catch (err) {
      // A re-download hits the unique constraint: the transfer was already
      // delivered, so there's nothing new to record or announce.
      if (err instanceof DuplicateDeliveryError) return;
      throw err;
    }
    const payload: TransferDeliveredPayload = { transferId };
    this.broadcaster.emitToRoom(roomId, TransferEvent.Delivered, payload);
  }
}
