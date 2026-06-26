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
}
