import { Injectable } from '@nestjs/common';
import type {
  Transfer as PrismaTransfer,
  FilePayload as PrismaFilePayload,
  TextPayload as PrismaTextPayload,
} from '@prisma/client';
import type {
  Transfer,
  FilePayload,
  TextPayload,
  PayloadType,
  CreateTransferInput,
  CreateFilePayloadInput,
  CreateTextPayloadInput,
  CreateTextTransferInput,
} from '../../../domain/transfer/transfer.entity';
import type { TransferRepository } from '../../../domain/transfer/transfer.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaTransferRepository implements TransferRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateTransferInput): Promise<Transfer> {
    return this.toEntity(await this.prisma.transfer.create({ data: input }));
  }

  async findById(id: string): Promise<Transfer | null> {
    const t = await this.prisma.transfer.findUnique({ where: { id } });
    return t ? this.toEntity(t) : null;
  }

  async findByRoomId(roomId: string): Promise<Transfer[]> {
    const transfers = await this.prisma.transfer.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
    });
    return transfers.map((t) => this.toEntity(t));
  }

  async createFilePayload(input: CreateFilePayloadInput): Promise<FilePayload> {
    return this.toFilePayloadEntity(await this.prisma.filePayload.create({ data: input }));
  }

  async findFilePayloadByTransferId(transferId: string): Promise<FilePayload | null> {
    const fp = await this.prisma.filePayload.findUnique({ where: { transferId } });
    return fp ? this.toFilePayloadEntity(fp) : null;
  }

  async findFilePayloadsByTransferIds(transferIds: string[]): Promise<FilePayload[]> {
    if (transferIds.length === 0) return [];
    const fps = await this.prisma.filePayload.findMany({
      where: { transferId: { in: transferIds } },
    });
    return fps.map((fp) => this.toFilePayloadEntity(fp));
  }

  async createTextPayload(input: CreateTextPayloadInput): Promise<TextPayload> {
    return this.toTextPayloadEntity(await this.prisma.textPayload.create({ data: input }));
  }

  async createTextTransfer(input: CreateTextTransferInput): Promise<Transfer> {
    // A nested create commits the Transfer and its TextPayload in one statement —
    // no window where the Transfer exists without content.
    const t = await this.prisma.transfer.create({
      data: {
        roomId: input.roomId,
        payloadType: input.payloadType,
        contentLength: input.contentLength,
        textPayload: { create: { content: input.content } },
      },
    });
    return this.toEntity(t);
  }

  async findTextPayloadsByTransferIds(transferIds: string[]): Promise<TextPayload[]> {
    if (transferIds.length === 0) return [];
    const tps = await this.prisma.textPayload.findMany({
      where: { transferId: { in: transferIds } },
    });
    return tps.map((tp) => this.toTextPayloadEntity(tp));
  }

  async listStorageKeysByRoomId(roomId: string): Promise<string[]> {
    const payloads = await this.prisma.filePayload.findMany({
      where: { transfer: { roomId } },
      select: { storageKey: true },
    });
    return payloads.map((p) => p.storageKey);
  }

  async deleteById(id: string): Promise<void> {
    // FilePayload, TextPayload and Delivery each hold a required FK to Transfer
    // with no DB-level cascade, so the children go first — one transaction keeps
    // the graph from being left half-deleted if a step fails.
    await this.prisma.$transaction([
      this.prisma.delivery.deleteMany({ where: { transferId: id } }),
      this.prisma.filePayload.deleteMany({ where: { transferId: id } }),
      this.prisma.textPayload.deleteMany({ where: { transferId: id } }),
      this.prisma.transfer.deleteMany({ where: { id } }),
    ]);
  }

  async deleteByRoomId(roomId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.delivery.deleteMany({ where: { transfer: { roomId } } }),
      this.prisma.filePayload.deleteMany({ where: { transfer: { roomId } } }),
      this.prisma.textPayload.deleteMany({ where: { transfer: { roomId } } }),
      this.prisma.transfer.deleteMany({ where: { roomId } }),
    ]);
  }

  private toEntity(t: PrismaTransfer): Transfer {
    return {
      id: t.id,
      roomId: t.roomId,
      payloadType: assertPayloadType(t.payloadType),
      contentLength: t.contentLength,
      createdAt: t.createdAt,
    };
  }

  private toFilePayloadEntity(fp: PrismaFilePayload): FilePayload {
    return {
      id: fp.id,
      transferId: fp.transferId,
      fileName: fp.fileName,
      fileSizeBytes: fp.fileSizeBytes,
      mimeType: fp.mimeType,
      storageKey: fp.storageKey,
    };
  }

  private toTextPayloadEntity(tp: PrismaTextPayload): TextPayload {
    return { id: tp.id, transferId: tp.transferId, content: tp.content };
  }
}

function assertPayloadType(value: string): PayloadType {
  if (value !== 'FILE' && value !== 'TEXT_SNIPPET' && value !== 'LINK') {
    throw new Error(`Unexpected PayloadType from DB: ${value}`);
  }
  return value;
}
