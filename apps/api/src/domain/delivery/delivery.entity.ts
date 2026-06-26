export interface Delivery {
  id: string;
  transferId: string;
  deliveredAt: Date;
  createdAt: Date;
}

export interface CreateDeliveryInput {
  transferId: string;
  deliveredAt: Date;
}
