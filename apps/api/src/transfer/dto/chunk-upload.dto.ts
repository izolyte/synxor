import { z } from 'zod';

// Multipart form fields arrive as strings; coerce the numerics. The chunk
// binary itself travels as the `chunk` file part, outside this schema.
export const chunkUploadSchema = z.object({
  transferId: z.string().min(1).optional(),
  chunkIndex: z.coerce.number().int().min(0),
  totalChunks: z.coerce.number().int().min(1),
  fileName: z.string().min(1).max(1024),
  fileSizeBytes: z.coerce.number().int().min(1),
  mimeType: z.string().min(1).max(255),
});

export type ChunkUploadRequest = z.infer<typeof chunkUploadSchema>;
