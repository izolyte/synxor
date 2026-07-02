import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '../domain/shared/domain-error';
import {
  ConcurrentTransferLimitError,
  FileTooLargeError,
  UploadRoomMismatchError,
  UploadSessionNotFoundError,
} from '../domain/transfer/transfer.errors';

// tRPC has its own error formatter; this is the REST equivalent for the upload
// endpoint, mapping domain failures onto HTTP without the service knowing HTTP.
@Catch(DomainError)
export class TransferErrorFilter implements ExceptionFilter<DomainError> {
  catch(error: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = statusFor(error);
    response.status(status).json({ statusCode: status, message: error.message });
  }
}

function statusFor(error: DomainError): number {
  if (error instanceof FileTooLargeError) return HttpStatus.PAYLOAD_TOO_LARGE;
  if (error instanceof UploadSessionNotFoundError) return HttpStatus.NOT_FOUND;
  if (error instanceof UploadRoomMismatchError) return HttpStatus.FORBIDDEN;
  if (error instanceof ConcurrentTransferLimitError) return HttpStatus.CONFLICT;
  return HttpStatus.BAD_REQUEST;
}
