import { z } from 'zod';
import { EXPIRY_VALUES } from '../../domain/room/room-expiry';

// Use-case I/O contract for creating a Room. Lives in the application layer so
// any transport (tRPC, future Socket.io, etc.) validates against the same shape.
export const createRoomSchema = z
  .object({
    expiry: z.enum(EXPIRY_VALUES),
  })
  .strict();

export type CreateRoomRequest = z.infer<typeof createRoomSchema>;

export interface CreateRoomResult {
  roomCode: string;
  roomToken: string;
}
