import { z } from 'zod';
import { ROOM_CODE_PATTERN } from '../../domain/room/room-code';
import type { PayloadType } from '../../domain/transfer/transfer.entity';
import type { ParticipantRole } from '../../domain/participant/participant.entity';
import type { ParticipantIdentity } from '../../domain/participant/participant-identity';

// Use-case I/O contract for reading a Room's Transfer history. Lives in the
// application layer so any transport validates against the same shape.
export const roomTransfersSchema = z
  .object({
    roomCode: z.string().regex(ROOM_CODE_PATTERN),
  })
  .strict();

export type RoomTransfersRequest = z.infer<typeof roomTransfersSchema>;

// One historical Transfer. Delivery is derived from a Delivery row's existence,
// not a persisted status column. bigint sizes are narrowed to number and the
// timestamp to an ISO string here — the tRPC link runs no transformer, so the
// wire payload must be plain JSON (raw bigint would throw on serialize).
// Who created a Transfer, resolved from its author Participant: the role plus the
// author's stable identity (colour + name) for attribution in the stream.
// `identity` is null only when no author is resolvable (e.g. a file in a Room with
// no recorded Sender). The whole author is null for rows that never had one.
export interface TransferAuthor {
  role: ParticipantRole;
  identity: ParticipantIdentity | null;
}

export interface RoomTransferItem {
  id: string;
  payloadType: PayloadType;
  fileName: string | null;
  fileSizeBytes: number | null;
  // The Text Snippet / Link body for TEXT_SNIPPET and LINK transfers; null for
  // files (their bytes live in object storage, not the Log).
  content: string | null;
  author: TransferAuthor | null;
  delivered: boolean;
  createdAt: string;
}

export type RoomTransfersResult = RoomTransferItem[];
