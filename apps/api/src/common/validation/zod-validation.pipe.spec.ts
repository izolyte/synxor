import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

const schema = z.object({
  name: z.string().min(1),
  count: z.coerce.number().int(),
});

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(schema);

  it('returns the parsed (coerced) value', () => {
    expect(pipe.transform({ name: 'a', count: '3' })).toEqual({ name: 'a', count: 3 });
  });

  it('throws a 400 carrying the zod issues', () => {
    try {
      pipe.transform({ name: '', count: 'x' });
      fail('expected BadRequestException');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const body = (err as BadRequestException).getResponse() as { message: unknown[] };
      // One issue per failing field, so the client can pinpoint both.
      expect(body.message).toHaveLength(2);
    }
  });
});
