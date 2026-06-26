export type RoomStatus = 'ACTIVE' | 'CLOSED' | 'EXPIRED';

export interface Room {
  id: string;
  code: string;
  status: RoomStatus;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateRoomInput {
  code: string;
  expiresAt: Date;
}
