import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  TRANSFER_REPOSITORY,
  type TransferRepository,
} from '../domain/transfer/transfer.repository';
import { OBJECT_STORAGE, type ObjectStorage } from '../domain/storage/object-storage';
import {
  MAX_CONCURRENT_TRANSFERS_PER_ROOM,
  UPLOAD_SESSION_STORE,
  type UploadSession,
  type UploadSessionStore,
} from '../domain/transfer/upload-session';
import { validateChunk } from '../domain/transfer/chunking';
import { chunkObjectKey, fileObjectKey } from '../domain/transfer/storage-key';
import {
  ConcurrentTransferLimitError,
  FileTooLargeError,
  UploadRoomMismatchError,
  UploadSessionNotFoundError,
} from '../domain/transfer/transfer.errors';
import { ChunkAssembler } from './chunk-assembler';
import { TransferProgressNotifier } from './transfer-progress.notifier';
import { CHUNKED_UPLOAD_OPTIONS, type ChunkedUploadOptions } from './transfer.options';

export interface AcceptChunkInput {
  roomId: string;
  transferId?: string;
  chunkIndex: number;
  totalChunks: number;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  chunk: Buffer;
}

export interface AcceptChunkResult {
  transferId: string;
  receivedChunks: number;
  totalChunks: number;
  complete: boolean;
}

@Injectable()
export class ChunkedUploadService {
  constructor(
    @Inject(TRANSFER_REPOSITORY) private readonly transfers: TransferRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(UPLOAD_SESSION_STORE) private readonly sessions: UploadSessionStore,
    private readonly assembler: ChunkAssembler,
    private readonly progress: TransferProgressNotifier,
    @Inject(CHUNKED_UPLOAD_OPTIONS) private readonly options: ChunkedUploadOptions,
  ) {}

  async acceptChunk(input: AcceptChunkInput): Promise<AcceptChunkResult> {
    // Resolve the session first, then validate the chunk against the size and
    // chunk count the session was opened with — never the per-request fields,
    // which a resumed upload could send inconsistently and corrupt the file.
    const session = input.transferId
      ? await this.resumeSession(input.transferId, input.roomId)
      : await this.openSession(input);

    validateChunk({
      fileSizeBytes: session.fileSizeBytes,
      totalChunks: session.totalChunks,
      chunkIndex: input.chunkIndex,
      byteLength: input.chunk.byteLength,
    });

    await this.storage.putObject(
      chunkObjectKey(session.roomId, session.transferId, input.chunkIndex),
      input.chunk,
      input.chunk.byteLength,
    );
    const updated = await this.sessions.markReceived(session.transferId, input.chunkIndex);

    const complete = updated.receivedChunks.size === updated.totalChunks;
    if (complete) {
      await this.assembler.assemble(updated);
      await this.sessions.delete(updated.transferId);
    }

    this.progress.chunkReceived(updated, updated.receivedChunks.size, complete);
    return {
      transferId: updated.transferId,
      receivedChunks: updated.receivedChunks.size,
      totalChunks: updated.totalChunks,
      complete,
    };
  }

  private async resumeSession(transferId: string, roomId: string): Promise<UploadSession> {
    const session = await this.sessions.get(transferId);
    if (!session) throw new UploadSessionNotFoundError(transferId);
    if (session.roomId !== roomId) throw new UploadRoomMismatchError(transferId);
    return session;
  }

  private async openSession(input: AcceptChunkInput): Promise<UploadSession> {
    if (input.fileSizeBytes > this.options.maxFileSizeBytes) {
      throw new FileTooLargeError(input.fileSizeBytes, this.options.maxFileSizeBytes);
    }

    // Pin the id up front so the room slot is claimed before any DB write; the
    // reserve is atomic, so concurrent opens can't overshoot the cap.
    const transferId = randomUUID();
    const session = await this.sessions.reserve(
      {
        transferId,
        roomId: input.roomId,
        fileName: input.fileName,
        fileSizeBytes: input.fileSizeBytes,
        mimeType: input.mimeType,
        totalChunks: input.totalChunks,
      },
      MAX_CONCURRENT_TRANSFERS_PER_ROOM,
    );
    if (!session) {
      throw new ConcurrentTransferLimitError(MAX_CONCURRENT_TRANSFERS_PER_ROOM);
    }

    try {
      await this.transfers.create({
        id: transferId,
        roomId: input.roomId,
        payloadType: 'FILE',
        contentLength: BigInt(input.fileSizeBytes),
      });
      await this.transfers.createFilePayload({
        transferId,
        fileName: input.fileName,
        fileSizeBytes: BigInt(input.fileSizeBytes),
        mimeType: input.mimeType,
        storageKey: fileObjectKey(input.roomId, transferId),
      });
    } catch (err) {
      // Release the reserved slot so a failed DB write doesn't strand it.
      await this.sessions.delete(transferId);
      throw err;
    }

    return session;
  }
}
