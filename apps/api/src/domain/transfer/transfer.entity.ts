export type PayloadType = 'FILE' | 'TEXT_SNIPPET' | 'LINK';

export interface Transfer {
  id: string;
  roomId: string;
  payloadType: PayloadType;
  contentLength: bigint;
  // The Participant who created it, or null when the author couldn't be resolved
  // (a file uploaded by a token that never joined over the socket, legacy
  // pre-two-way rows).
  authorParticipantId: string | null;
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
  // The uploading Participant, for author attribution in the stream. Optional: the
  // upload path resolves it from the Room Token, and null when no row matches.
  authorParticipantId?: string | null;
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
  // The Participant creating it, for author attribution. Any Participant may send
  // over the socket, so this is always known here.
  authorParticipantId: string;
}
