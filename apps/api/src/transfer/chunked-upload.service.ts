import { Inject, Injectable, Optional } from '@nestjs/common';
import { Readable } from 'stream';
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
import { resolveMaxFileSizeBytes, validateChunk } from '../domain/transfer/chunking';
import { chunkObjectKey, fileObjectKey } from '../domain/transfer/storage-key';
import {
  ConcurrentTransferLimitError,
  FileTooLargeError,
  UploadRoomMismatchError,
  UploadSessionNotFoundError,
} from '../domain/transfer/transfer.errors';
import { ROOM_BROADCASTER, type RoomBroadcaster } from '../room/room-broadcaster';
import { TransferEvent, type TransferProgressPayload } from './transfer-events';

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

export interface ChunkedUploadOptions {
  maxFileSizeBytes: number;
}

export const CHUNKED_UPLOAD_OPTIONS = Symbol('CHUNKED_UPLOAD_OPTIONS');

export function chunkedUploadOptionsFromEnv(): ChunkedUploadOptions {
  return { maxFileSizeBytes: resolveMaxFileSizeBytes(process.env.MAX_FILE_SIZE_BYTES) };
}

@Injectable()
export class ChunkedUploadService {
  constructor(
    @Inject(TRANSFER_REPOSITORY) private readonly transfers: TransferRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(UPLOAD_SESSION_STORE) private readonly sessions: UploadSessionStore,
    @Inject(ROOM_BROADCASTER) private readonly broadcaster: RoomBroadcaster,
    @Optional()
    @Inject(CHUNKED_UPLOAD_OPTIONS)
    private readonly options: ChunkedUploadOptions = chunkedUploadOptionsFromEnv(),
  ) {}

  async acceptChunk(input: AcceptChunkInput): Promise<AcceptChunkResult> {
    if (input.fileSizeBytes > this.options.maxFileSizeBytes) {
      throw new FileTooLargeError(input.fileSizeBytes, this.options.maxFileSizeBytes);
    }
    validateChunk({
      fileSizeBytes: input.fileSizeBytes,
      totalChunks: input.totalChunks,
      chunkIndex: input.chunkIndex,
      byteLength: input.chunk.byteLength,
    });

    const session = input.transferId
      ? await this.resumeSession(input.transferId, input.roomId)
      : await this.openSession(input);

    await this.storage.putObject(
      chunkObjectKey(session.roomId, session.transferId, input.chunkIndex),
      input.chunk,
      input.chunk.byteLength,
    );
    const updated = await this.sessions.markReceived(session.transferId, input.chunkIndex);

    const complete = updated.receivedChunks.size === updated.totalChunks;
    if (complete) await this.assemble(updated);

    const result: AcceptChunkResult = {
      transferId: updated.transferId,
      receivedChunks: updated.receivedChunks.size,
      totalChunks: updated.totalChunks,
      complete,
    };
    this.broadcastProgress(updated, result);
    return result;
  }

  private async resumeSession(transferId: string, roomId: string): Promise<UploadSession> {
    const session = await this.sessions.get(transferId);
    if (!session) throw new UploadSessionNotFoundError(transferId);
    if (session.roomId !== roomId) throw new UploadRoomMismatchError(transferId);
    return session;
  }

  private async openSession(input: AcceptChunkInput): Promise<UploadSession> {
    const active = await this.sessions.countByRoom(input.roomId);
    if (active >= MAX_CONCURRENT_TRANSFERS_PER_ROOM) {
      throw new ConcurrentTransferLimitError(MAX_CONCURRENT_TRANSFERS_PER_ROOM);
    }

    const transfer = await this.transfers.create({
      roomId: input.roomId,
      payloadType: 'FILE',
      contentLength: BigInt(input.fileSizeBytes),
    });
    await this.transfers.createFilePayload({
      transferId: transfer.id,
      fileName: input.fileName,
      fileSizeBytes: BigInt(input.fileSizeBytes),
      mimeType: input.mimeType,
      storageKey: fileObjectKey(input.roomId, transfer.id),
    });

    return this.sessions.create({
      transferId: transfer.id,
      roomId: input.roomId,
      fileName: input.fileName,
      fileSizeBytes: input.fileSizeBytes,
      mimeType: input.mimeType,
      totalChunks: input.totalChunks,
    });
  }

  // Streams chunk objects in order into the final object, so assembly never
  // holds more than one chunk in memory regardless of file size.
  private async assemble(session: UploadSession): Promise<void> {
    const { roomId, transferId, totalChunks } = session;
    const concatenated = Readable.from(this.readChunksInOrder(session));
    await this.storage.putObject(
      fileObjectKey(roomId, transferId),
      concatenated,
      session.fileSizeBytes,
      session.mimeType,
    );

    await Promise.all(
      Array.from({ length: totalChunks }, (_, i) =>
        this.storage.removeObject(chunkObjectKey(roomId, transferId, i)),
      ),
    );
    await this.sessions.delete(transferId);
  }

  private async *readChunksInOrder(session: UploadSession): AsyncGenerator<Buffer> {
    for (let i = 0; i < session.totalChunks; i++) {
      const chunk = await this.storage.getObject(
        chunkObjectKey(session.roomId, session.transferId, i),
      );
      yield* chunk as AsyncIterable<Buffer>;
    }
  }

  private broadcastProgress(session: UploadSession, result: AcceptChunkResult): void {
    const payload: TransferProgressPayload = {
      transferId: result.transferId,
      fileName: session.fileName,
      fileSizeBytes: session.fileSizeBytes,
      receivedChunks: result.receivedChunks,
      totalChunks: result.totalChunks,
      complete: result.complete,
    };
    this.broadcaster.emitToRoom(session.roomId, TransferEvent.Progress, payload);
  }
}
