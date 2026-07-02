export const ROOM_BROADCASTER = Symbol('ROOM_BROADCASTER');

// Outbound-only seam over the Socket.io server, so application services can
// broadcast to a Room without depending on the gateway (or a real socket) —
// tests use a fake, and future transports slot in here.
export interface RoomBroadcaster {
  emitToRoom(roomId: string, event: string, payload: unknown): void;
}
