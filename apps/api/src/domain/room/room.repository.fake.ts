import type { Room, CreateRoomInput, RoomStatus } from './room.entity';
import type { RoomRepository } from './room.repository';
import { RoomCodeCollisionError } from './room.errors';

// In-memory RoomRepository for tests. `stored` is public so specs can seed and
// inspect state directly. Excluded from the production build (*.fake.ts).
export class InMemoryRoomRepository implements RoomRepository {
  readonly stored = new Map<string, Room>();
  private nextId = 1;

  async create(input: CreateRoomInput): Promise<Room> {
    if (this.stored.has(input.code)) {
      throw new RoomCodeCollisionError(input.code);
    }
    const room: Room = {
      id: `room-${this.nextId++}`,
      code: input.code,
      status: 'ACTIVE',
      expiresAt: input.expiresAt,
      createdAt: new Date(),
    };
    this.stored.set(room.code, room);
    return room;
  }

  async findById(id: string): Promise<Room | null> {
    return [...this.stored.values()].find((r) => r.id === id) ?? null;
  }

  async findByCode(code: string): Promise<Room | null> {
    return this.stored.get(code) ?? null;
  }

  async updateStatus(id: string, status: RoomStatus): Promise<Room> {
    const room = [...this.stored.values()].find((r) => r.id === id)!;
    const updated: Room = { ...room, status };
    this.stored.set(room.code, updated);
    return updated;
  }

  async findExpiredActive(): Promise<Room[]> {
    const now = new Date();
    return [...this.stored.values()].filter((r) => r.status === 'ACTIVE' && r.expiresAt <= now);
  }

  async delete(id: string): Promise<void> {
    const room = [...this.stored.values()].find((r) => r.id === id);
    if (room) this.stored.delete(room.code);
  }
}
