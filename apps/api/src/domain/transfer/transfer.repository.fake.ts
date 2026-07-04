import type {
  CreateFilePayloadInput,
  CreateTransferInput,
  FilePayload,
  Transfer,
} from './transfer.entity';
import type { TransferRepository } from './transfer.repository';

export class FakeTransferRepository implements TransferRepository {
  readonly transfers = new Map<string, Transfer>();
  readonly filePayloads = new Map<string, FilePayload>();
  private seq = 0;

  create(input: CreateTransferInput): Promise<Transfer> {
    const transfer: Transfer = {
      id: input.id ?? `transfer-${++this.seq}`,
      roomId: input.roomId,
      payloadType: input.payloadType,
      contentLength: input.contentLength,
      createdAt: new Date(),
    };
    this.transfers.set(transfer.id, transfer);
    return Promise.resolve(transfer);
  }

  findById(id: string): Promise<Transfer | null> {
    return Promise.resolve(this.transfers.get(id) ?? null);
  }

  findByRoomId(roomId: string): Promise<Transfer[]> {
    return Promise.resolve([...this.transfers.values()].filter((t) => t.roomId === roomId));
  }

  createFilePayload(input: CreateFilePayloadInput): Promise<FilePayload> {
    const payload: FilePayload = { id: `payload-${++this.seq}`, ...input };
    this.filePayloads.set(payload.transferId, payload);
    return Promise.resolve(payload);
  }

  findFilePayloadByTransferId(transferId: string): Promise<FilePayload | null> {
    return Promise.resolve(this.filePayloads.get(transferId) ?? null);
  }
}
