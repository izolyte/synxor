export type PayloadType = 'FILE' | 'TEXT_SNIPPET' | 'LINK';

export interface Transfer {
  id: string;
  roomId: string;
  payloadType: PayloadType;
  contentLength: bigint;
  createdAt: Date;
}

export interface FilePayload {
  id: string;
  transferId: string;
  fileName: string;
  fileSizeBytes: bigint;
  mimeType: string;
  storageKey: string;
}

export interface CreateTransferInput {
  roomId: string;
  payloadType: PayloadType;
  contentLength: bigint;
}

export interface CreateFilePayloadInput {
  transferId: string;
  fileName: string;
  fileSizeBytes: bigint;
  mimeType: string;
  storageKey: string;
}
