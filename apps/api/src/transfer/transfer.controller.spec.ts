import { Readable } from 'stream';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'http';
import { TOKEN_VERIFIER } from '../domain/security/token-verifier';
import { TokenRole, type TokenClaims } from '../domain/security/token-issuer';
import { CHUNK_SIZE_BYTES } from '../domain/transfer/chunking';
import { FileTooLargeError, UploadSessionNotFoundError } from '../domain/transfer/transfer.errors';
import { RoomTokenGuard } from '../common/auth/room-token.guard';
import { RoomRoleGuard } from '../common/auth/room-role.guard';
import { TransferController } from './transfer.controller';
import {
  ChunkedUploadService,
  type AcceptChunkInput,
  type AcceptChunkResult,
} from './chunked-upload.service';
import { TransferDownloadService, type TransferDownload } from './transfer-download.service';

// Controls what claims are returned per token string — no real JWT needed.
class FakeTokenVerifier {
  private readonly map = new Map<string, TokenClaims>();
  register(token: string, claims: TokenClaims): void {
    this.map.set(token, claims);
  }
  verify(token: string): TokenClaims {
    const claims = this.map.get(token);
    if (!claims) throw new Error(`unknown token "${token}"`);
    return claims;
  }
}

class FakeChunkedUploadService {
  readonly calls: AcceptChunkInput[] = [];
  result: AcceptChunkResult = {
    transferId: 'transfer-1',
    receivedChunks: 1,
    totalChunks: 2,
    complete: false,
  };
  error?: Error;

  acceptChunk(input: AcceptChunkInput): Promise<AcceptChunkResult> {
    this.calls.push(input);
    return this.error ? Promise.reject(this.error) : Promise.resolve(this.result);
  }
}

class FakeTransferDownloadService {
  readonly calls: Array<{ transferId: string; roomId: string }> = [];
  download: Omit<TransferDownload, 'stream'> & { content: Buffer } = {
    fileName: 'video.mp4',
    fileSizeBytes: 5,
    mimeType: 'video/mp4',
    content: Buffer.from('hello'),
  };
  error?: Error;

  open(transferId: string, roomId: string): Promise<TransferDownload> {
    this.calls.push({ transferId, roomId });
    if (this.error) return Promise.reject(this.error);
    const { content, ...meta } = this.download;
    return Promise.resolve({ ...meta, stream: Readable.from(content) });
  }
}

describe('TransferController', () => {
  let app: INestApplication;
  let uploads: FakeChunkedUploadService;
  let downloads: FakeTransferDownloadService;

  const senderToken = 'sender-tok';
  const receiverToken = 'receiver-tok';

  beforeEach(async () => {
    uploads = new FakeChunkedUploadService();
    downloads = new FakeTransferDownloadService();
    const verifier = new FakeTokenVerifier();
    verifier.register(senderToken, { roomId: 'room-1', role: TokenRole.Sender });
    verifier.register(receiverToken, { roomId: 'room-1', role: TokenRole.Receiver });

    const module = await Test.createTestingModule({
      controllers: [TransferController],
      providers: [
        RoomTokenGuard,
        RoomRoleGuard,
        { provide: TOKEN_VERIFIER, useValue: verifier },
        { provide: ChunkedUploadService, useValue: uploads },
        { provide: TransferDownloadService, useValue: downloads },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  function http(): Server {
    return app.getHttpServer() as Server;
  }

  // supertest types the body as any; funnel message reads through one cast.
  function messageOf(res: request.Response): unknown {
    return (res.body as { message: unknown }).message;
  }

  function postChunk(token: string, fields: Record<string, string>, chunk?: Buffer) {
    let req = request(http()).post('/transfer/chunk').auth(token, { type: 'bearer' });
    for (const [name, value] of Object.entries(fields)) req = req.field(name, value);
    return chunk ? req.attach('chunk', chunk, 'blob') : req;
  }

  const validFields = {
    chunkIndex: '0',
    totalChunks: '2',
    fileName: 'video.mp4',
    fileSizeBytes: String(CHUNK_SIZE_BYTES + 100),
    mimeType: 'video/mp4',
  };

  describe('POST /transfer/chunk', () => {
    it('rejects a request without a token', async () => {
      await request(http()).post('/transfer/chunk').expect(401);
    });

    it('rejects a Receiver with 403', async () => {
      const res = await postChunk(receiverToken, validFields, Buffer.alloc(10)).expect(403);
      expect(messageOf(res)).toBe('Only the Sender may upload');
      expect(uploads.calls).toHaveLength(0);
    });

    it('rejects a request missing the chunk file part', async () => {
      const res = await postChunk(senderToken, validFields).expect(400);
      expect(messageOf(res)).toBe('Missing chunk file part');
    });

    it('rejects fields that fail schema validation', async () => {
      const res = await postChunk(
        senderToken,
        { ...validFields, chunkIndex: 'not-a-number' },
        Buffer.alloc(10),
      ).expect(400);
      expect(messageOf(res)).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ['chunkIndex'] })]),
      );
      expect(uploads.calls).toHaveLength(0);
    });

    it('delegates a valid chunk with the room from the token, not the body', async () => {
      const chunk = Buffer.alloc(CHUNK_SIZE_BYTES, 1);
      const res = await postChunk(senderToken, validFields, chunk).expect(201);

      expect(res.body).toEqual(uploads.result);
      expect(uploads.calls).toHaveLength(1);
      expect(uploads.calls[0]).toMatchObject({
        roomId: 'room-1',
        chunkIndex: 0,
        totalChunks: 2,
        fileName: 'video.mp4',
        fileSizeBytes: CHUNK_SIZE_BYTES + 100,
        mimeType: 'video/mp4',
      });
      expect(uploads.calls[0].chunk.equals(chunk)).toBe(true);
    });

    it('maps a domain failure through the error filter', async () => {
      uploads.error = new FileTooLargeError(10, 5);
      const res = await postChunk(senderToken, validFields, Buffer.alloc(10)).expect(413);
      expect(res.body).toEqual({ statusCode: 413, message: uploads.error.message });
    });
  });

  describe('GET /transfer/:transferId/download', () => {
    it('streams the file with metadata headers', async () => {
      const res = await request(http())
        .get('/transfer/transfer-1/download')
        .auth(receiverToken, { type: 'bearer' })
        // superagent doesn't buffer video/* on its own
        .buffer()
        .parse((res, cb) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => cb(null, Buffer.concat(chunks)));
        })
        .expect(200);

      expect(downloads.calls).toEqual([{ transferId: 'transfer-1', roomId: 'room-1' }]);
      expect(res.headers['content-type']).toBe('video/mp4');
      expect(res.headers['content-length']).toBe('5');
      expect(res.headers['content-disposition']).toBe("attachment; filename*=UTF-8''video.mp4");
      expect(res.body).toEqual(Buffer.from('hello'));
    });

    it('RFC 5987-encodes filenames that cannot travel raw in a header', async () => {
      downloads.download.fileName = 'héllo file.mp4';
      const res = await request(http())
        .get('/transfer/transfer-1/download')
        .auth(receiverToken, { type: 'bearer' })
        .expect(200);

      expect(res.headers['content-disposition']).toBe(
        "attachment; filename*=UTF-8''h%C3%A9llo%20file.mp4",
      );
    });

    it('accepts the token as a query parameter for browser-native downloads', async () => {
      await request(http()).get(`/transfer/transfer-1/download?token=${receiverToken}`).expect(200);
    });

    it('returns 404 for an unknown transfer', async () => {
      downloads.error = new UploadSessionNotFoundError('nope');
      const res = await request(http())
        .get('/transfer/nope/download')
        .auth(receiverToken, { type: 'bearer' })
        .expect(404);
      expect(res.body).toEqual({ statusCode: 404, message: downloads.error.message });
    });
  });
});
