import type { Room, CreateRoomInput, RoomStatus } from './room.entity';
import type { RoomRepository } from './room.repository';
import { RoomCodeCollisionError } from './room.errors';

// In-memory RoomRepository for tests. `stored` is public so specs can seed and
// inspect state directly. Excluded from the production build (*.fake.ts).
export class InMemoryRoomRepository implements RoomRepository {
  readonly stored = new Map<string, Room>();
  private nextId = 1;

  create(input: CreateRoomInput): Promise<Room> {
    if (this.stored.has(input.code)) {
      return Promise.reject(new RoomCodeCollisionError(input.code));
    }
    const room: Room = {
      id: `room-${this.nextId++}`,
      code: input.code,
      status: 'ACTIVE',
      expiresAt: input.expiresAt,
      createdAt: new Date(),
    };
    this.stored.set(room.code, room);
    return Promise.resolve(room);
  }

  findById(id: string): Promise<Room | null> {
    return Promise.resolve([...this.stored.values()].find((r) => r.id === id) ?? null);
  }

  findByCode(code: string): Promise<Room | null> {
    return Promise.resolve(this.stored.get(code) ?? null);
  }

  updateStatus(id: string, status: RoomStatus): Promise<Room> {
    const room = [...this.stored.values()].find((r) => r.id === id)!;
    const updated: Room = { ...room, status };
    this.stored.set(room.code, updated);
    return Promise.resolve(updated);
  }

  findExpiredActive(): Promise<Room[]> {
    const now = new Date();
    return Promise.resolve(
      [...this.stored.values()].filter((r) => r.status === 'ACTIVE' && r.expiresAt <= now),
    );
  }

  delete(id: string): Promise<void> {
    const room = [...this.stored.values()].find((r) => r.id === id);
    if (room) this.stored.delete(room.code);
    return Promise.resolve();
  }
}
