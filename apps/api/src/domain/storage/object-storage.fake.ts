import { Readable } from 'stream';
import { ObjectNotFoundError, type ObjectStorage } from './object-storage';

export class FakeObjectStorage implements ObjectStorage {
  readonly objects = new Map<string, Buffer>();

  async putObject(key: string, body: Buffer | Readable): Promise<void> {
    if (Buffer.isBuffer(body)) {
      this.objects.set(key, body);
      return;
    }
    const parts: Buffer[] = [];
    for await (const part of body) {
      parts.push(Buffer.isBuffer(part) ? part : Buffer.from(part as string));
    }
    this.objects.set(key, Buffer.concat(parts));
  }

  getObject(key: string, offset = 0): Promise<Readable> {
    const buf = this.objects.get(key);
    if (!buf) return Promise.reject(new ObjectNotFoundError(key));
    return Promise.resolve(Readable.from(offset > 0 ? buf.subarray(offset) : buf));
  }

  removeObject(key: string): Promise<void> {
    this.objects.delete(key);
    return Promise.resolve();
  }
}
