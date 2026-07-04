import { Inject, Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { OBJECT_STORAGE, type ObjectStorage } from '../domain/storage/object-storage';
import type { UploadSession } from '../domain/transfer/upload-session';
import { chunkObjectKey, fileObjectKey } from '../domain/transfer/storage-key';

// Turns a fully-received upload's chunk objects into the single final object
// and disposes of the chunks. Pure storage work — session lifecycle stays with
// the upload service, so a failed assembly leaves everything retryable.
@Injectable()
export class ChunkAssembler {
  constructor(@Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage) {}

  // Streams chunk objects in order into the final object, so assembly never
  // holds more than one chunk in memory regardless of file size.
  async assemble(session: UploadSession): Promise<void> {
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
  }

  private async *readChunksInOrder(session: UploadSession): AsyncGenerator<Buffer> {
    for (let i = 0; i < session.totalChunks; i++) {
      const chunk = await this.storage.getObject(
        chunkObjectKey(session.roomId, session.transferId, i),
      );
      yield* chunk as AsyncIterable<Buffer>;
    }
  }
}
