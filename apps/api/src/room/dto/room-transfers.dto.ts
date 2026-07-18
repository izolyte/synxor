import { z } from 'zod';
import { ROOM_CODE_PATTERN } from '../../domain/room/room-code';
import type { PayloadType } from '../../domain/transfer/transfer.entity';

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
export interface RoomTransferItem {
  id: string;
  payloadType: PayloadType;
  fileName: string | null;
  fileSizeBytes: number | null;
  delivered: boolean;
  createdAt: string;
}

export type RoomTransfersResult = RoomTransferItem[];
