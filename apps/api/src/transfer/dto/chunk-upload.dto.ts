import { z } from 'zod';

// `type/subtype` with optional `; param=value` tail, restricted to RFC 2045
// token characters. This is echoed straight into the download's Content-Type
// header, so the tight character set is what keeps a crafted client from
// smuggling CR/LF or control chars into a response header.
const MIME_TYPE =
  /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+(?:;[ \t]?[A-Za-z0-9!#$&^_.+-]+=[A-Za-z0-9!#$&^_.+"-]+)*$/;

// Multipart form fields arrive as strings; coerce the numerics. The chunk
// binary itself travels as the `chunk` file part, outside this schema.
export const chunkUploadSchema = z.object({
  transferId: z.string().min(1).optional(),
  chunkIndex: z.coerce.number().int().min(0),
  totalChunks: z.coerce.number().int().min(1),
  fileName: z.string().min(1).max(1024),
  fileSizeBytes: z.coerce.number().int().min(1),
  mimeType: z.string().min(1).max(255).regex(MIME_TYPE, 'Invalid MIME type'),
});

export type ChunkUploadRequest = z.infer<typeof chunkUploadSchema>;
