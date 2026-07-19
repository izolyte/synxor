import type {
  CreateFilePayloadInput,
  CreateTextPayloadInput,
  CreateTextTransferInput,
  CreateTransferInput,
  FilePayload,
  TextPayload,
  Transfer,
} from './transfer.entity';
import type { TransferRepository } from './transfer.repository';

export class FakeTransferRepository implements TransferRepository {
  readonly transfers = new Map<string, Transfer>();
  readonly filePayloads = new Map<string, FilePayload>();
  readonly textPayloads = new Map<string, TextPayload>();
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

  findFilePayloadsByTransferIds(transferIds: string[]): Promise<FilePayload[]> {
    const ids = new Set(transferIds);
    return Promise.resolve([...this.filePayloads.values()].filter((p) => ids.has(p.transferId)));
  }

  createTextPayload(input: CreateTextPayloadInput): Promise<TextPayload> {
    const payload: TextPayload = { id: `text-${++this.seq}`, ...input };
    this.textPayloads.set(payload.transferId, payload);
    return Promise.resolve(payload);
  }

  createTextTransfer(input: CreateTextTransferInput): Promise<Transfer> {
    const transfer: Transfer = {
      id: `transfer-${++this.seq}`,
      roomId: input.roomId,
      payloadType: input.payloadType,
      contentLength: input.contentLength,
      createdAt: new Date(),
    };
    this.transfers.set(transfer.id, transfer);
    this.textPayloads.set(transfer.id, {
      id: `text-${++this.seq}`,
      transferId: transfer.id,
      content: input.content,
    });
    return Promise.resolve(transfer);
  }

  findTextPayloadsByTransferIds(transferIds: string[]): Promise<TextPayload[]> {
    const ids = new Set(transferIds);
    return Promise.resolve([...this.textPayloads.values()].filter((p) => ids.has(p.transferId)));
  }

  listStorageKeysByRoomId(roomId: string): Promise<string[]> {
    const keys = [...this.transfers.values()]
      .filter((t) => t.roomId === roomId)
      .map((t) => this.filePayloads.get(t.id)?.storageKey)
      .filter((key): key is string => key !== undefined);
    return Promise.resolve(keys);
  }

  deleteById(id: string): Promise<void> {
    this.transfers.delete(id);
    this.filePayloads.delete(id);
    this.textPayloads.delete(id);
    return Promise.resolve();
  }

  deleteByRoomId(roomId: string): Promise<void> {
    for (const transfer of [...this.transfers.values()]) {
      if (transfer.roomId === roomId) {
        this.transfers.delete(transfer.id);
        this.filePayloads.delete(transfer.id);
        this.textPayloads.delete(transfer.id);
      }
    }
    return Promise.resolve();
  }
}
