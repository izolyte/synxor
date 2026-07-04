import type { ArgumentsHost } from '@nestjs/common';
import { TransferErrorFilter } from './transfer-error.filter';
import {
  ChunkSizeMismatchError,
  ConcurrentTransferLimitError,
  FileTooLargeError,
  UploadRoomMismatchError,
  UploadSessionNotFoundError,
} from '../domain/transfer/transfer.errors';
import type { DomainError } from '../domain/shared/domain-error';

// Minimal Express response stand-in that records what the filter sent.
class FakeResponse {
  statusCode = 0;
  body: unknown;
  status(code: number): this {
    this.statusCode = code;
    return this;
  }
  json(body: unknown): void {
    this.body = body;
  }
}

function hostFor(response: FakeResponse): ArgumentsHost {
  return {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
}

describe('TransferErrorFilter', () => {
  const filter = new TransferErrorFilter();

  const cases: Array<[DomainError, number]> = [
    [new FileTooLargeError(10, 5), 413],
    [new UploadSessionNotFoundError('t1'), 404],
    [new UploadRoomMismatchError('t1'), 403],
    [new ConcurrentTransferLimitError(10), 409],
    // Anything without an explicit mapping (chunk-shape errors) is a 400.
    [new ChunkSizeMismatchError(0, 1, 2), 400],
  ];

  it.each(cases)('maps %s to its HTTP status', (error, status) => {
    const response = new FakeResponse();
    filter.catch(error, hostFor(response));
    expect(response.statusCode).toBe(status);
    expect(response.body).toEqual({ statusCode: status, message: error.message });
  });
});
