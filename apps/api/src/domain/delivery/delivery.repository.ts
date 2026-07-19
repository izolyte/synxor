import type { Delivery, CreateDeliveryInput } from './delivery.entity';

export const DELIVERY_REPOSITORY = Symbol('DELIVERY_REPOSITORY');

export interface DeliveryRepository {
  create(input: CreateDeliveryInput): Promise<Delivery>;
  findByTransferId(transferId: string): Promise<Delivery | null>;
  // Batched sibling of findByTransferId for whole-history lookups.
  findByTransferIds(transferIds: string[]): Promise<Delivery[]>;
}
