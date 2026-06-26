export class DuplicateDeliveryError extends Error {
  constructor(transferId: string) {
    super(`Delivery already recorded for transfer ${transferId}`);
    this.name = 'DuplicateDeliveryError';
  }
}
