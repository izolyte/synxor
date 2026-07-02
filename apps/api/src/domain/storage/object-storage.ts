import type { Readable } from 'stream';

export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

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
