import type {
  Transfer,
  FilePayload,
  TextPayload,
  CreateTransferInput,
  CreateFilePayloadInput,
  CreateTextPayloadInput,
  CreateTextTransferInput,
} from './transfer.entity';

export const TRANSFER_REPOSITORY = Symbol('TRANSFER_REPOSITORY');

export interface TransferRepository {
  create(input: CreateTransferInput): Promise<Transfer>;
  findById(id: string): Promise<Transfer | null>;
  findByRoomId(roomId: string): Promise<Transfer[]>;
  createFilePayload(input: CreateFilePayloadInput): Promise<FilePayload>;
  findFilePayloadByTransferId(transferId: string): Promise<FilePayload | null>;
  // Batched sibling of findFilePayloadByTransferId — one round-trip for a whole
  // Room's history instead of one per Transfer.
  findFilePayloadsByTransferIds(transferIds: string[]): Promise<FilePayload[]>;
  createTextPayload(input: CreateTextPayloadInput): Promise<TextPayload>;
  // Atomically create a Text/Link Transfer and its TextPayload in one write, so a
  // failure never commits a Transfer row with no content (an orphan the Log would
  // hydrate as an empty, non-functional row).
  createTextTransfer(input: CreateTextTransferInput): Promise<Transfer>;
  // Batched read for the Transfer Log: one round-trip for a Room's text/link
  // content instead of one per Transfer.
  findTextPayloadsByTransferIds(transferIds: string[]): Promise<TextPayload[]>;
  // Storage keys for every FilePayload in a Room — what the expiry sweeper feeds
  // to object storage before it drops the rows those keys point at.
  listStorageKeysByRoomId(roomId: string): Promise<string[]>;
  // Delete a Transfer graph (Transfer + its FilePayload/TextPayload/Delivery).
  // Both variants cascade the dependent rows so callers never trip the FK
  // constraints.
  deleteById(id: string): Promise<void>;
  deleteByRoomId(roomId: string): Promise<void>;
}
