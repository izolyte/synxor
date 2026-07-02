import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

// Zod counterpart of Nest's ValidationPipe: 400 with the raw issue list so
// clients see exactly which field failed. Bind per-parameter, e.g.
// `@Body(new ZodValidationPipe(schema))`.
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return parsed.data;
  }
}
