import type { ParticipantRole } from '../participant/participant.entity';
import type { ParticipantIdentity } from '../participant/participant-identity';

export const UPLOAD_SESSION_STORE = Symbol('UPLOAD_SESSION_STORE');

export const MAX_CONCURRENT_TRANSFERS_PER_ROOM = 10;

// The uploader, resolved once when the session opens and held for the life of the
// upload so every progress broadcast attributes the file without a per-chunk
// lookup. `participantId` is null when the token has no socket row to attribute
// to; the identity is still derived from the token so the stream can label it.
export interface UploadAuthor {
  participantId: string | null;
  role: ParticipantRole;
  identity: ParticipantIdentity;
}

export interface UploadSession {
  transferId: string;
  roomId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  totalChunks: number;
  receivedChunks: ReadonlySet<number>;
  author?: UploadAuthor;
}

export interface CreateUploadSessionInput {
  transferId: string;
  roomId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  totalChunks: number;
  author?: UploadAuthor;
}

// Tracks which chunks of an in-flight upload have landed. In-memory today;
// the seam exists so Redis (#26) can take over without touching the service.
export interface UploadSessionStore {
  // Claim a room slot and register the session in one atomic step. Returns null
  // when the room is already at `maxPerRoom` in-flight uploads. Atomicity is the
  // point: a check-then-create pair would let concurrent opens race past the cap.
  reserve(input: CreateUploadSessionInput, maxPerRoom: number): Promise<UploadSession | null>;
  get(transferId: string): Promise<UploadSession | null>;
  markReceived(transferId: string, chunkIndex: number): Promise<UploadSession>;
  delete(transferId: string): Promise<void>;
  // Sessions opened before `openedBefore` and never completed — a sender that
  // walked away mid-upload. The sweeper reaps these to free the room slot and
  // clear the partial chunk objects they left in storage.
  findAbandoned(openedBefore: Date): Promise<UploadSession[]>;
}
