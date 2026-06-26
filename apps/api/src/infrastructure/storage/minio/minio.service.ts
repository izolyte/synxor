import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from 'minio';
import type { Readable } from 'stream';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: Client;
  private readonly bucket: string;

  constructor() {
    const accessKey = process.env.MINIO_ROOT_USER;
    const secretKey = process.env.MINIO_ROOT_PASSWORD;
    if (!accessKey || !secretKey) {
      throw new Error('MINIO_ROOT_USER and MINIO_ROOT_PASSWORD are required');
    }
    this.client = new Client({
      endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
      port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
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
        if (i === maxRetries - 1) throw err;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  async putObject(key: string, data: Buffer | Readable, size?: number, contentType?: string): Promise<void> {
    const resolvedSize = size ?? (Buffer.isBuffer(data) ? data.byteLength : -1);
    const meta = contentType ? { 'Content-Type': contentType } : {};
    await this.client.putObject(this.bucket, key, data, resolvedSize, meta);
  }

  async getObject(key: string): Promise<Readable> {
    return this.client.getObject(this.bucket, key);
  }

  async removeObject(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
