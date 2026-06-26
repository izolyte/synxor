import type { Delivery, CreateDeliveryInput } from './delivery.entity';

export const DELIVERY_REPOSITORY = Symbol('DELIVERY_REPOSITORY');

export interface DeliveryRepository {
  create(input: CreateDeliveryInput): Promise<Delivery>;
  findByTransferId(transferId: string): Promise<Delivery | null>;
}
