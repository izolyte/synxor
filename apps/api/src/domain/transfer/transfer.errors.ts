import { DomainError } from '../shared/domain-error';

export class FileTooLargeError extends DomainError {
  constructor(fileSizeBytes: number, maxFileSizeBytes: number) {
    super(`File of ${fileSizeBytes} bytes exceeds the ${maxFileSizeBytes}-byte limit`);
  }
}

export class ChunkTotalMismatchError extends DomainError {
  constructor(totalChunks: number, expected: number) {
    super(`totalChunks ${totalChunks} does not match the ${expected} chunks the file size implies`);
  }
}

export class ChunkOutOfRangeError extends DomainError {
  constructor(chunkIndex: number, totalChunks: number) {
    super(`chunkIndex ${chunkIndex} is outside [0, ${totalChunks})`);
  }
}

export class ChunkSizeMismatchError extends DomainError {
  constructor(chunkIndex: number, byteLength: number, expected: number) {
    super(`Chunk ${chunkIndex} is ${byteLength} bytes; expected exactly ${expected}`);
  }
}

export class UploadSessionNotFoundError extends DomainError {
  constructor(transferId: string) {
    super(`No active upload session for Transfer ${transferId}`);
  }
}

export class UploadRoomMismatchError extends DomainError {
  constructor(transferId: string) {
    super(`Transfer ${transferId} does not belong to the authenticated Room`);
  }
}

export class ConcurrentTransferLimitError extends DomainError {
  constructor(limit: number) {
    super(`Room already has ${limit} Transfers in flight`);
  }
}
