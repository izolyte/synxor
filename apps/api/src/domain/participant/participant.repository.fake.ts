/* eslint-disable @typescript-eslint/require-await --
   Methods are async to satisfy the async ParticipantRepository interface; the
   in-memory bodies have nothing to await. */
import type { Participant, CreateParticipantInput, ParticipantRole } from './participant.entity';
import type { ParticipantRepository } from './participant.repository';

// In-memory ParticipantRepository for tests. `stored` is public so specs can
// seed and inspect state directly. Excluded from production build (*.fake.ts).
export class InMemoryParticipantRepository implements ParticipantRepository {
  readonly stored = new Map<string, Participant>();
  private nextId = 1;

  async create(input: CreateParticipantInput): Promise<Participant> {
    const participant: Participant = {
      id: `participant-${this.nextId++}`,
      roomId: input.roomId,
      role: input.role,
      tokenHash: input.tokenHash,
      joinedAt: new Date(),
      disconnectedAt: null,
    };
    this.stored.set(participant.id, participant);
    return participant;
  }

  async findByRoomId(roomId: string): Promise<Participant[]> {
    return [...this.stored.values()].filter((p) => p.roomId === roomId);
  }

  async setDisconnected(id: string, at: Date): Promise<Participant> {
    const participant = this.stored.get(id);
    if (!participant) throw new Error(`Participant not found: ${id}`);
    const updated: Participant = { ...participant, disconnectedAt: at };
    this.stored.set(id, updated);
    return updated;
  }

  async countConnected(roomId: string, role?: ParticipantRole): Promise<number> {
    return [...this.stored.values()].filter(
      (p) =>
        p.roomId === roomId && p.disconnectedAt === null && (role === undefined || p.role === role),
    ).length;
  }

  async markAllDisconnected(at: Date): Promise<number> {
    let count = 0;
    for (const [id, p] of this.stored) {
      if (p.disconnectedAt === null) {
        this.stored.set(id, { ...p, disconnectedAt: at });
        count++;
      }
    }
    return count;
  }
}
