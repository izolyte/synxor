import { z, type ZodType } from 'zod';

// tRPC's non-batched success envelope: { result: { data: <output> } }. Wraps a
// procedure's output schema so e2e tests parse the HTTP body into a typed value
/**
 * Builds a schema for a non-batched tRPC success response envelope.
 *
 * @param data - The schema for the procedure result data.
 * @returns A schema for an object shaped like `{ result: { data } }`.
 */
export function trpcResult<T extends ZodType>(data: T) {
  return z.object({ result: z.object({ data }) });
}
