export const UPLOAD_SESSION_STORE = Symbol('UPLOAD_SESSION_STORE');

export const MAX_CONCURRENT_TRANSFERS_PER_ROOM = 10;

export interface UploadSession {
  transferId: string;
  roomId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  totalChunks: number;
  receivedChunks: ReadonlySet<number>;
}

export interface CreateUploadSessionInput {
  transferId: string;
  roomId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  totalChunks: number;
}

// Tracks which chunks of an in-flight upload have landed. In-memory today;
// the seam exists so Redis (#26) can take over without touching the service.
export interface UploadSessionStore {
  create(input: CreateUploadSessionInput): Promise<UploadSession>;
  get(transferId: string): Promise<UploadSession | null>;
  markReceived(transferId: string, chunkIndex: number): Promise<UploadSession>;
  delete(transferId: string): Promise<void>;
  countByRoom(roomId: string): Promise<number>;
}
