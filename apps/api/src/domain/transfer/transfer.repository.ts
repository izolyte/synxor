import type {
  Transfer,
  FilePayload,
  CreateTransferInput,
  CreateFilePayloadInput,
} from './transfer.entity';

export const TRANSFER_REPOSITORY = Symbol('TRANSFER_REPOSITORY');

export interface TransferRepository {
  create(input: CreateTransferInput): Promise<Transfer>;
  findById(id: string): Promise<Transfer | null>;
  findByRoomId(roomId: string): Promise<Transfer[]>;
  createFilePayload(input: CreateFilePayloadInput): Promise<FilePayload>;
  findFilePayloadByTransferId(transferId: string): Promise<FilePayload | null>;
  // Storage keys for every FilePayload in a Room — what the expiry sweeper feeds
  // to object storage before it drops the rows those keys point at.
  listStorageKeysByRoomId(roomId: string): Promise<string[]>;
  // Delete a Transfer graph (Transfer + its FilePayload/Delivery). Both variants
  // cascade the dependent rows so callers never trip the FK constraints.
  deleteById(id: string): Promise<void>;
  deleteByRoomId(roomId: string): Promise<void>;
}
