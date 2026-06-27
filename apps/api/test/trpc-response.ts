import { z, type ZodType } from 'zod';

// tRPC's non-batched success envelope: { result: { data: <output> } }. Wraps a
// procedure's output schema so e2e tests parse the HTTP body into a typed value
// instead of reaching into `any`.
export function trpcResult<T extends ZodType>(data: T) {
  return z.object({ result: z.object({ data }) });
}
