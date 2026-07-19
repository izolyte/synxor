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
  // Callers may pin the id (the upload path reserves it before the DB write so
  // the room concurrency slot is claimed atomically); omit to let the DB assign.
  id?: string;
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

export interface TextPayload {
  id: string;
  transferId: string;
  content: string;
}

export interface CreateTextPayloadInput {
  transferId: string;
  content: string;
}

// A Text Snippet / Link Transfer written as one unit: the Transfer row and its
// TextPayload together, so a failure can't leave a Transfer with no content.
export interface CreateTextTransferInput {
  roomId: string;
  payloadType: Extract<PayloadType, 'TEXT_SNIPPET' | 'LINK'>;
  content: string;
  contentLength: bigint;
}
