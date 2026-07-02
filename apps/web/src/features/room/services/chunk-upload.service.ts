import { CHUNK_SIZE_BYTES } from "~/features/room/constants/transfer";

export interface ChunkUploadResponse {
  transferId: string;
  receivedChunks: number;
  totalChunks: number;
  complete: boolean;
}

export interface UploadFileOptions {
  file: File;
  token: string;
  apiOrigin: string;
  /** 0–100, called after every accepted chunk. */
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
  /** Test seam; defaults to global fetch. */
  fetchFn?: typeof fetch;
}

export class UploadError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

function messageFor(status: number): string {
  // Mirrors the API's transfer-error.filter mapping.
  if (status === 413) return "This file exceeds the size limit.";
  if (status === 409) return "This Room already has 10 Transfers in flight. Wait for one to finish.";
  if (status === 401) return "Your Room session is no longer valid. Refresh and rejoin.";
  return "Upload failed. Check your connection and try again.";
}

/**
 * Streams one file to the chunked upload endpoint: 256 KB slices, sequential
 * requests, first response assigns the transferId the rest reference. Sequential
 * (not parallel) keeps per-chunk progress monotonic and lets the Receiver's
 * early download follow chunk order.
 */
export async function uploadFileInChunks({
  file,
  token,
  apiOrigin,
  onProgress,
  signal,
  fetchFn = fetch,
}: UploadFileOptions): Promise<ChunkUploadResponse> {
  const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE_BYTES));
  let transferId: string | undefined;
  let last: ChunkUploadResponse | undefined;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE_BYTES;
    const body = new FormData();
    if (transferId) body.set("transferId", transferId);
    body.set("chunkIndex", String(chunkIndex));
    body.set("totalChunks", String(totalChunks));
    body.set("fileName", file.name);
    body.set("fileSizeBytes", String(file.size));
    body.set("mimeType", file.type || "application/octet-stream");
    body.set("chunk", file.slice(start, start + CHUNK_SIZE_BYTES));

    const response = await fetchFn(`${apiOrigin}/transfer/chunk`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
      signal,
    });
    if (!response.ok) throw new UploadError(messageFor(response.status), response.status);

    last = (await response.json()) as ChunkUploadResponse;
    transferId = last.transferId;
    onProgress?.(Math.round(((chunkIndex + 1) / totalChunks) * 100));
  }

  // totalChunks >= 1, so the loop always ran at least once.
  return last as ChunkUploadResponse;
}

/** Authenticated download URL. Token rides a query param because a plain <a download> navigation can't set headers. */
export function downloadUrl(apiOrigin: string, transferId: string, token: string): string {
  return `${apiOrigin}/transfer/${encodeURIComponent(transferId)}/download?token=${encodeURIComponent(token)}`;
}
