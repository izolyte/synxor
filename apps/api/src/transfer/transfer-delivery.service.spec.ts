import type { RoomBroadcaster } from '../room/room-broadcaster';
import type { DeliveryRepository } from '../domain/delivery/delivery.repository';
import type { Delivery, CreateDeliveryInput } from '../domain/delivery/delivery.entity';
import { DuplicateDeliveryError } from '../domain/delivery/delivery.errors';
import { TransferDeliveryService } from './transfer-delivery.service';
import { TransferEvent } from './transfer-events';

class FakeBroadcaster implements RoomBroadcaster {
  readonly emitted: Array<{ roomId: string; event: string; payload: unknown }> = [];
  emitToRoom(roomId: string, event: string, payload: unknown): void {
    this.emitted.push({ roomId, event, payload });
  }
}

class FakeDeliveryRepository implements DeliveryRepository {
  readonly created: CreateDeliveryInput[] = [];
  error?: Error;

  create(input: CreateDeliveryInput): Promise<Delivery> {
    this.created.push(input);
    if (this.error) return Promise.reject(this.error);
    return Promise.resolve({ id: 'delivery-1', createdAt: new Date(), ...input });
  }
  findByTransferId(): Promise<Delivery | null> {
    return Promise.resolve(null);
  }
  findByTransferIds(): Promise<Delivery[]> {
    return Promise.resolve([]);
  }
}

describe('TransferDeliveryService', () => {
  let deliveries: FakeDeliveryRepository;
  let broadcaster: FakeBroadcaster;
  let service: TransferDeliveryService;

  beforeEach(() => {
    deliveries = new FakeDeliveryRepository();
    broadcaster = new FakeBroadcaster();
    service = new TransferDeliveryService(deliveries, broadcaster);
  });

  it('records the delivery and emits transfer:delivered to the room', async () => {
    await service.confirmDelivered('transfer-1', 'room-1');

    expect(deliveries.created).toHaveLength(1);
    expect(deliveries.created[0].transferId).toBe('transfer-1');
    expect(deliveries.created[0].deliveredAt).toBeInstanceOf(Date);
    expect(broadcaster.emitted).toEqual([
      { roomId: 'room-1', event: TransferEvent.Delivered, payload: { transferId: 'transfer-1' } },
    ]);
  });

  it('treats a repeat download as a no-op: no re-emit, no throw', async () => {
    deliveries.error = new DuplicateDeliveryError('transfer-1');

    await expect(service.confirmDelivered('transfer-1', 'room-1')).resolves.toBeUndefined();
    expect(broadcaster.emitted).toHaveLength(0);
  });

  it('propagates an unexpected repository error and does not emit', async () => {
    deliveries.error = new Error('db down');

    await expect(service.confirmDelivered('transfer-1', 'room-1')).rejects.toThrow('db down');
    expect(broadcaster.emitted).toHaveLength(0);
  });
});
