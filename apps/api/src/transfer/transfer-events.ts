import type { ParticipantRole } from '../domain/participant/participant.entity';
import type { ParticipantIdentity } from '../domain/participant/participant-identity';

// Server → client transfer events. Same contract-in-one-place rule as
// room-events.ts: FE and BE both import these names, nobody hard-codes a literal.
export const TransferEvent = {
  Progress: 'transfer:progress',
  Delivered: 'transfer:delivered',
  // Client → server: the Sender submits a Text Snippet / Link to the Room.
  SendText: 'transfer:text:send',
  // Server → Room: the classified payload, delivered to the other participants.
  Text: 'transfer:text',
} as const;
export type TransferEvent = (typeof TransferEvent)[keyof typeof TransferEvent];

export interface TransferProgressPayload {
  transferId: string;
  fileName: string;
  fileSizeBytes: number;
  receivedChunks: number;
  totalChunks: number;
  complete: boolean;
}

export interface TransferDeliveredPayload {
  transferId: string;
}

// Who sent a Text Snippet / Link: the role plus the author's stable identity
// (colour + name) so the stream attributes it by name in the author's colour.
// `identity` is null only for the rare case of a file with no resolvable Sender.
export interface TransferAuthor {
  role: ParticipantRole;
  identity: ParticipantIdentity | null;
}

export interface TransferTextPayload {
  transferId: string;
  payloadType: 'TEXT_SNIPPET' | 'LINK';
  content: string;
  author: TransferAuthor;
}

// Socket ack returned to the author: the persisted id plus the server's
// classification, so the sender echoes the same row its peers receive (its own
// send is never broadcast back). Or a reason on failure.
export type TransferTextAck =
  | { transferId: string; payloadType: 'TEXT_SNIPPET' | 'LINK'; content: string }
  | { error: string };
