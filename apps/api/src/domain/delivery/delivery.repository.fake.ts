import type { Delivery, CreateDeliveryInput } from './delivery.entity';
import type { DeliveryRepository } from './delivery.repository';

export class FakeDeliveryRepository implements DeliveryRepository {
  readonly deliveries = new Map<string, Delivery>();
  private seq = 0;

  create(input: CreateDeliveryInput): Promise<Delivery> {
    const delivery: Delivery = {
      id: `delivery-${++this.seq}`,
      createdAt: new Date(),
      ...input,
    };
    this.deliveries.set(delivery.transferId, delivery);
    return Promise.resolve(delivery);
  }

  findByTransferId(transferId: string): Promise<Delivery | null> {
    return Promise.resolve(this.deliveries.get(transferId) ?? null);
  }

  findByTransferIds(transferIds: string[]): Promise<Delivery[]> {
    const ids = new Set(transferIds);
    return Promise.resolve([...this.deliveries.values()].filter((d) => ids.has(d.transferId)));
  }
}
