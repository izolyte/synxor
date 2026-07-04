import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from 'minio';
import type { Readable } from 'stream';
import { ObjectNotFoundError, type ObjectStorage } from '../../../domain/storage/object-storage';

// S3/MinIO codes for a missing object. `InvalidRange` is deliberately excluded:
// a bad byte range is a caller bug, not a missing object, and must not be
// swallowed as "not there yet".
const NOT_FOUND_CODES = new Set(['NoSuchKey', 'NotFound']);

function isNotFound(err: unknown): boolean {
  return NOT_FOUND_CODES.has((err as { code?: string })?.code ?? '');
}

function isPermanentError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return ['AccessDenied', 'InvalidAccessKeyId', 'SignatureDoesNotMatch'].includes(code ?? '');
}

@Injectable()
export class MinioService implements OnModuleInit, ObjectStorage {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: Client;
  private readonly bucket: string;

  constructor() {
    const accessKey = process.env.MINIO_ROOT_USER;
    const secretKey = process.env.MINIO_ROOT_PASSWORD;

    if (!accessKey) throw new Error('MINIO_ROOT_USER is required');
    if (!secretKey) throw new Error('MINIO_ROOT_PASSWORD is required');

    const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
    const portRaw = process.env.MINIO_PORT || '9000';
    const port = parseInt(portRaw, 10);

    if (isNaN(port)) {
      throw new Error(`MINIO_PORT must be a number, got: "${process.env.MINIO_PORT}"`);
    }

    this.client = new Client({
      endPoint: endpoint,
      port,
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey,
      secretKey,
    });
    this.bucket = process.env.MINIO_BUCKET ?? 'transfers';
  }

  async onModuleInit(): Promise<void> {
    const maxRetries = 5;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const exists = await this.client.bucketExists(this.bucket);
        if (!exists) {
          await this.client.makeBucket(this.bucket);
          this.logger.log(`Bucket "${this.bucket}" created`);
        }
        return;
      } catch (err) {
        this.logger.warn(
          `MinIO init attempt ${i + 1}/${maxRetries} failed: ${(err as Error).message}`,
        );
        if (isPermanentError(err) || i === maxRetries - 1) throw err;
        const delay = 1000 * 2 ** i + Math.random() * 500;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  async putObject(
    key: string,
    body: Buffer | Readable,
    size?: number,
    contentType?: string,
  ): Promise<void> {
    const resolvedSize = size ?? (Buffer.isBuffer(body) ? body.byteLength : undefined);
    const meta = contentType ? { 'Content-Type': contentType } : {};
    await this.client.putObject(this.bucket, key, body, resolvedSize, meta);
  }

  async getObject(key: string, offset = 0): Promise<Readable> {
    try {
      if (offset > 0) return await this.client.getPartialObject(this.bucket, key, offset);
      return await this.client.getObject(this.bucket, key);
    } catch (err) {
      if (isNotFound(err)) throw new ObjectNotFoundError(key);
      throw err;
    }
  }

  async removeObject(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
