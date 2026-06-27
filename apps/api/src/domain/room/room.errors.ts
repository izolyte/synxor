export class RoomCodeCollisionError extends Error {
  constructor(code: string) {
    super(`Room Code already in use: ${code}`);
    this.name = 'RoomCodeCollisionError';
  }
}
