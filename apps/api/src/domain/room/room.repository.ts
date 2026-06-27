import type { Room, RoomStatus, CreateRoomInput } from './room.entity';

export const ROOM_REPOSITORY = Symbol('ROOM_REPOSITORY');

export interface RoomRepository {
  // Throws RoomCodeCollisionError if input.code is already taken.
  create(input: CreateRoomInput): Promise<Room>;
  findById(id: string): Promise<Room | null>;
  findByCode(code: string): Promise<Room | null>;
  updateStatus(id: string, status: RoomStatus): Promise<Room>;
  findExpiredActive(): Promise<Room[]>;
  delete(id: string): Promise<void>;
}
