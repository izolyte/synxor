import { z } from 'zod';

// Everything is a string in process.env; coerce numerics so downstream readers
// don't have to. Loose object: modules own vars this schema doesn't know about.
const envSchema = z.looseObject({
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
  API_PORT: z.coerce.number().int().positive().optional(),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().regex(/^rediss?:\/\//, 'must be a redis:// or rediss:// URL'),

  // Presence only — byte-length strength is SecurityModule's concern.
  JWT_SECRET: z.string().min(1),

  MINIO_ROOT_USER: z.string().min(1),
  MINIO_ROOT_PASSWORD: z.string().min(1),
  MINIO_PORT: z.coerce.number().int().positive().optional(),
  MAX_FILE_SIZE_BYTES: z.coerce.number().int().positive().optional(),
});

// Fails the boot with every offending var named at once, rather than letting a
// missing var surface as a runtime error on the first request that needs it.
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment: ${detail}`);
  }
  return result.data;
}
