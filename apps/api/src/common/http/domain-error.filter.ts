import { type ArgumentsHost, type ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '../../domain/shared/domain-error';

type DomainErrorClass = new (...args: never[]) => DomainError;

// tRPC has its own error formatter; this is the REST equivalent, mapping domain
// failures onto HTTP without services knowing HTTP. Feature filters subclass it,
// declare @Catch(DomainError), and supply their error → status table. First
// instanceof match wins; anything unlisted falls back to 400.
export abstract class DomainErrorFilter implements ExceptionFilter<DomainError> {
  protected abstract readonly statusByError: ReadonlyArray<readonly [DomainErrorClass, HttpStatus]>;

  catch(error: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.statusFor(error);
    response.status(status).json({ statusCode: status, message: error.message });
  }

  private statusFor(error: DomainError): HttpStatus {
    for (const [type, status] of this.statusByError) {
      if (error instanceof type) return status;
    }
    return HttpStatus.BAD_REQUEST;
  }
}
