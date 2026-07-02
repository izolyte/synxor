import { Test } from '@nestjs/testing';
import { MinioService } from './minio.service';
import { Client } from 'minio';

jest.mock('minio');

const mockClient = {
  bucketExists: jest.fn(),
  makeBucket: jest.fn(),
  putObject: jest.fn(),
  getObject: jest.fn(),
  getPartialObject: jest.fn(),
  removeObject: jest.fn(),
};

(Client as jest.MockedClass<typeof Client>).mockImplementation(
  () => mockClient as unknown as Client,
);

describe('MinioService', () => {
  let service: MinioService;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.MINIO_ROOT_USER = 'minioadmin';
    process.env.MINIO_ROOT_PASSWORD = 'changeme';
    process.env.MINIO_BUCKET = 'transfers';

    const module = await Test.createTestingModule({ providers: [MinioService] }).compile();
    service = module.get(MinioService);
  });

  describe('constructor', () => {
    it('throws when MINIO_ROOT_USER is missing', () => {
      delete process.env.MINIO_ROOT_USER;
      expect(() => new MinioService()).toThrow('MINIO_ROOT_USER is required');
    });

    it('throws when MINIO_ROOT_PASSWORD is missing', () => {
      process.env.MINIO_ROOT_USER = 'minioadmin';
      delete process.env.MINIO_ROOT_PASSWORD;
      expect(() => new MinioService()).toThrow('MINIO_ROOT_PASSWORD is required');
    });
  });

  describe('onModuleInit', () => {
    it('creates bucket when it does not exist', async () => {
      mockClient.bucketExists.mockResolvedValue(false);
      mockClient.makeBucket.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockClient.bucketExists).toHaveBeenCalledWith('transfers');
      expect(mockClient.makeBucket).toHaveBeenCalledWith('transfers');
    });

    it('skips makeBucket when bucket already exists', async () => {
      mockClient.bucketExists.mockResolvedValue(true);

      await service.onModuleInit();

      expect(mockClient.makeBucket).not.toHaveBeenCalled();
    });

    it('retries on transient error and succeeds', async () => {
      jest.useFakeTimers();
      mockClient.bucketExists
        .mockRejectedValueOnce(new Error('connect ECONNREFUSED'))
        .mockResolvedValue(true);

      const init = service.onModuleInit();
      await jest.runAllTimersAsync();
      await init;

      expect(mockClient.bucketExists).toHaveBeenCalledTimes(2);
      expect(mockClient.makeBucket).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('throws after 5 failed attempts', async () => {
      jest.useFakeTimers();
      mockClient.bucketExists.mockRejectedValue(new Error('connect ECONNREFUSED'));

      const assertion = expect(service.onModuleInit()).rejects.toThrow('connect ECONNREFUSED');
      await jest.runAllTimersAsync();
      await assertion;

      expect(mockClient.bucketExists).toHaveBeenCalledTimes(5);
      jest.useRealTimers();
    });
  });

  describe('smoke test — upload → retrieve → delete', () => {
    const key = 'smoke/test.txt';
    const data = Buffer.from('hello');

    it('putObject delegates to client with contentType', async () => {
      mockClient.putObject.mockResolvedValue({ etag: 'abc', versionId: null });

      await service.putObject(key, data, data.byteLength, 'text/plain');

      expect(mockClient.putObject).toHaveBeenCalledWith('transfers', key, data, data.byteLength, {
        'Content-Type': 'text/plain',
      });
    });

    it('putObject auto-computes size from Buffer when omitted', async () => {
      mockClient.putObject.mockResolvedValue({ etag: 'abc', versionId: null });

      await service.putObject(key, data);

      expect(mockClient.putObject).toHaveBeenCalledWith(
        'transfers',
        key,
        data,
        data.byteLength,
        {},
      );
    });

    it('putObject passes undefined size for Readable without explicit size', async () => {
      const stream = { pipe: jest.fn() } as unknown as import('stream').Readable;
      mockClient.putObject.mockResolvedValue({ etag: 'abc', versionId: null });

      await service.putObject(key, stream);

      expect(mockClient.putObject).toHaveBeenCalledWith('transfers', key, stream, undefined, {});
    });

    it('putObject passes empty meta when contentType omitted', async () => {
      mockClient.putObject.mockResolvedValue({ etag: 'abc', versionId: null });

      await service.putObject(key, data, data.byteLength);

      expect(mockClient.putObject).toHaveBeenCalledWith(
        'transfers',
        key,
        data,
        data.byteLength,
        {},
      );
    });

    it('getObject returns client stream', async () => {
      const fakeStream = { pipe: jest.fn() };
      mockClient.getObject.mockResolvedValue(fakeStream);

      const stream = await service.getObject(key);

      expect(mockClient.getObject).toHaveBeenCalledWith('transfers', key);
      expect(stream).toBe(fakeStream);
    });

    it('getObject with an offset requests a partial object', async () => {
      const fakeStream = { pipe: jest.fn() };
      mockClient.getPartialObject.mockResolvedValue(fakeStream);

      const stream = await service.getObject(key, 1024);

      expect(mockClient.getPartialObject).toHaveBeenCalledWith('transfers', key, 1024);
      expect(mockClient.getObject).not.toHaveBeenCalled();
      expect(stream).toBe(fakeStream);
    });

    it('getObject with a zero offset takes the whole-object path', async () => {
      const fakeStream = { pipe: jest.fn() };
      mockClient.getObject.mockResolvedValue(fakeStream);

      await service.getObject(key, 0);

      expect(mockClient.getObject).toHaveBeenCalledWith('transfers', key);
      expect(mockClient.getPartialObject).not.toHaveBeenCalled();
    });

    it('removeObject delegates to client', async () => {
      mockClient.removeObject.mockResolvedValue(undefined);

      await service.removeObject(key);

      expect(mockClient.removeObject).toHaveBeenCalledWith('transfers', key);
    });
  });
});
