import { chunkUploadSchema } from './chunk-upload.dto';

function base(overrides: Record<string, unknown> = {}) {
  return {
    chunkIndex: '0',
    totalChunks: '2',
    fileName: 'video.mp4',
    fileSizeBytes: '1000',
    mimeType: 'video/mp4',
    ...overrides,
  };
}

describe('chunkUploadSchema', () => {
  it('coerces the numeric multipart fields', () => {
    const parsed = chunkUploadSchema.parse(base());
    expect(parsed).toMatchObject({ chunkIndex: 0, totalChunks: 2, fileSizeBytes: 1000 });
  });

  it.each(['application/octet-stream', 'text/plain;charset=utf-8', 'text/plain; charset=utf-8'])(
    'accepts the well-formed MIME type %s',
    (mimeType) => {
      expect(() => chunkUploadSchema.parse(base({ mimeType }))).not.toThrow();
    },
  );

  it.each([
    'text/plain\r\nX-Injected: 1', // header injection via CRLF
    'not-a-mime-type',
    'video/', // missing subtype
    '',
  ])('rejects the malformed MIME type %j', (mimeType) => {
    expect(() => chunkUploadSchema.parse(base({ mimeType }))).toThrow();
  });
});
