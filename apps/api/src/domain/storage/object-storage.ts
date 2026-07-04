import type { Readable } from 'stream';

export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

// Thrown by `getObject` when the key isn't present. Callers that poll for an
// object still being written (the Receiver following a live upload) need to tell
// "not there yet" apart from a real storage failure, so this is a distinct type
// rather than a bare Error.
export class ObjectNotFoundError extends Error {
  constructor(readonly key: string) {
    super(`No object at key ${key}`);
    this.name = 'ObjectNotFoundError';
  }
}

// Storage port for file payloads. MinIO satisfies it in production; tests use
// the in-memory fake. `offset` lets a reader resume mid-object — a downloader
// that was following chunk objects switches to the assembled object without
// re-sending bytes.
export interface ObjectStorage {
  putObject(
    key: string,
    body: Buffer | Readable,
    size?: number,
    contentType?: string,
  ): Promise<void>;
  getObject(key: string, offset?: number): Promise<Readable>;
  removeObject(key: string): Promise<void>;
}
