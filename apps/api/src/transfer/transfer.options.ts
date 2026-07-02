import type { Provider } from '@nestjs/common';

export const CHUNKED_UPLOAD_OPTIONS = Symbol('CHUNKED_UPLOAD_OPTIONS');
export const TRANSFER_DOWNLOAD_OPTIONS = Symbol('TRANSFER_DOWNLOAD_OPTIONS');

export interface ChunkedUploadOptions {
  maxFileSizeBytes: number;
}

export interface TransferDownloadOptions {
  pollIntervalMs: number;
}

const DEFAULT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024;
const DEFAULT_POLL_INTERVAL_MS = 200;

export function resolveMaxFileSizeBytes(envValue: string | undefined): number {
  if (envValue === undefined) return DEFAULT_MAX_FILE_SIZE_BYTES;
  const parsed = Number(envValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`MAX_FILE_SIZE_BYTES must be a positive integer, got: "${envValue}"`);
  }
  return parsed;
}

// Env is read here, at composition time, so the services stay constructible
// with plain option objects in tests.
export const transferOptionsProviders: Provider[] = [
  {
    provide: CHUNKED_UPLOAD_OPTIONS,
    useFactory: (): ChunkedUploadOptions => ({
      maxFileSizeBytes: resolveMaxFileSizeBytes(process.env.MAX_FILE_SIZE_BYTES),
    }),
  },
  {
    provide: TRANSFER_DOWNLOAD_OPTIONS,
    useValue: { pollIntervalMs: DEFAULT_POLL_INTERVAL_MS } satisfies TransferDownloadOptions,
  },
];
