import { Catch, HttpStatus } from '@nestjs/common';
import { DomainError } from '../domain/shared/domain-error';
import { DomainErrorFilter } from '../common/http/domain-error.filter';
import {
  ConcurrentTransferLimitError,
  FileTooLargeError,
  UploadRoomMismatchError,
  UploadSessionNotFoundError,
} from '../domain/transfer/transfer.errors';

// Chunk-shape errors (mismatched totals, sizes, indices) fall through to the
// base filter's 400.
@Catch(DomainError)
export class TransferErrorFilter extends DomainErrorFilter {
  protected readonly statusByError = [
    [FileTooLargeError, HttpStatus.PAYLOAD_TOO_LARGE],
    [UploadSessionNotFoundError, HttpStatus.NOT_FOUND],
    [UploadRoomMismatchError, HttpStatus.FORBIDDEN],
    [ConcurrentTransferLimitError, HttpStatus.CONFLICT],
  ] as const;
}
