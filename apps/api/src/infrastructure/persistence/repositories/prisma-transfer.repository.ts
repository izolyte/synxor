import { Injectable } from '@nestjs/common';
import type { Transfer as PrismaTransfer, FilePayload as PrismaFilePayload } from '@prisma/client';
import type {
  Transfer,
  FilePayload,
  PayloadType,
  CreateTransferInput,
  CreateFilePayloadInput,
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
}

function assertPayloadType(value: string): PayloadType {
  if (value !== 'FILE' && value !== 'TEXT_SNIPPET' && value !== 'LINK') {
    throw new Error(`Unexpected PayloadType from DB: ${value}`);
  }
  return value;
}
