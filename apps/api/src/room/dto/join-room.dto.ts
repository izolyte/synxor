import { z } from 'zod';
import { ROOM_CODE_PATTERN } from '../../domain/room/room-code';

// Use-case I/O contract for joining a Room. Lives in the application layer so
// any transport (tRPC, future Socket.io, etc.) validates against the same shape.
export const joinRoomSchema = z
  .object({
    roomCode: z.string().regex(ROOM_CODE_PATTERN),
  })
  .strict();

export type JoinRoomRequest = z.infer<typeof joinRoomSchema>;

export interface JoinRoomResult {
  roomToken: string;
  roomId: string;
}
