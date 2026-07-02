import { Inject, Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import {
  TRANSFER_REPOSITORY,
  type TransferRepository,
} from '../domain/transfer/transfer.repository';
import { OBJECT_STORAGE, type ObjectStorage } from '../domain/storage/object-storage';
import { UPLOAD_SESSION_STORE, type UploadSessionStore } from '../domain/transfer/upload-session';
import { CHUNK_SIZE_BYTES } from '../domain/transfer/chunking';
import { chunkObjectKey } from '../domain/transfer/storage-key';
import {
  UploadRoomMismatchError,
  UploadSessionNotFoundError,
} from '../domain/transfer/transfer.errors';
import { TRANSFER_DOWNLOAD_OPTIONS, type TransferDownloadOptions } from './transfer.options';

export interface TransferDownload {
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  stream: Readable;
}

// Lets a Receiver start pulling a file while the Sender is still uploading it:
// chunk objects are streamed as they land, and once assembly replaces them the
// reader hops onto the final object at the byte offset it had reached.
@Injectable()
export class TransferDownloadService {
  constructor(
    @Inject(TRANSFER_REPOSITORY) private readonly transfers: TransferRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(UPLOAD_SESSION_STORE) private readonly sessions: UploadSessionStore,
    @Inject(TRANSFER_DOWNLOAD_OPTIONS) private readonly options: TransferDownloadOptions,
  ) {}

  async open(transferId: string, roomId: string): Promise<TransferDownload> {
    const payload = await this.transfers.findFilePayloadByTransferId(transferId);
    if (!payload) throw new UploadSessionNotFoundError(transferId);
    const transfer = await this.transfers.findById(transferId);
    if (!transfer || transfer.roomId !== roomId) throw new UploadRoomMismatchError(transferId);

    const fileSizeBytes = Number(payload.fileSizeBytes);
    const session = await this.sessions.get(transferId);
    const stream = session
      ? Readable.from(this.followUpload(transferId, roomId, payload.storageKey))
      : await this.storage.getObject(payload.storageKey);

    return { fileName: payload.fileName, fileSizeBytes, mimeType: payload.mimeType, stream };
  }

  private async *followUpload(
    transferId: string,
    roomId: string,
    storageKey: string,
  ): AsyncGenerator<Buffer> {
    let chunkIndex = 0;
    for (;;) {
      const session = await this.sessions.get(transferId);
      if (!session) {
        // Assembly finished and dropped the session; the chunk objects may be
        // gone too. Continue from the assembled object where we left off.
        const rest = await this.storage.getObject(storageKey, chunkIndex * CHUNK_SIZE_BYTES);
        yield* rest as AsyncIterable<Buffer>;
        return;
      }
      if (!session.receivedChunks.has(chunkIndex)) {
        await sleep(this.options.pollIntervalMs);
        continue;
      }
      let chunk: AsyncIterable<Buffer>;
      try {
        chunk = await this.storage.getObject(chunkObjectKey(roomId, transferId, chunkIndex));
      } catch {
        // Assembly can delete this chunk object between the session check and
        // the read; back off (a bare continue would busy-spin on microtasks and
        // starve the timers) and loop so the session-gone branch takes over.
        await sleep(this.options.pollIntervalMs);
        continue;
      }
      yield* chunk;
      chunkIndex++;
      if (chunkIndex === session.totalChunks) return;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
