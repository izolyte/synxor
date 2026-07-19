import { Injectable } from '@nestjs/common';
import type { Participant as PrismaParticipant } from '@prisma/client';
import type {
  Participant,
  ParticipantRole,
  CreateParticipantInput,
} from '../../../domain/participant/participant.entity';
import type { ParticipantRepository } from '../../../domain/participant/participant.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaParticipantRepository implements ParticipantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateParticipantInput): Promise<Participant> {
    return this.toEntity(await this.prisma.participant.create({ data: input }));
  }

  async findByRoomId(roomId: string): Promise<Participant[]> {
    const participants = await this.prisma.participant.findMany({ where: { roomId } });
    return participants.map((p) => this.toEntity(p));
  }

  async setDisconnected(id: string, at: Date): Promise<Participant> {
    await this.prisma.participant.updateMany({
      where: { id, disconnectedAt: null },
      data: { disconnectedAt: at },
    });
    const p = await this.prisma.participant.findUnique({ where: { id } });
    if (!p) throw new Error(`Participant not found: ${id}`);
    return this.toEntity(p);
  }

  countConnected(roomId: string, role?: ParticipantRole): Promise<number> {
    return this.prisma.participant.count({
      where: { roomId, disconnectedAt: null, ...(role ? { role } : {}) },
    });
  }

  async markAllDisconnected(at: Date): Promise<number> {
    const { count } = await this.prisma.participant.updateMany({
      where: { disconnectedAt: null },
      data: { disconnectedAt: at },
    });
    return count;
  }

  private toEntity(p: PrismaParticipant): Participant {
    return {
      id: p.id,
      roomId: p.roomId,
      role: assertParticipantRole(p.role),
      tokenHash: p.tokenHash,
      joinedAt: p.joinedAt,
      disconnectedAt: p.disconnectedAt,
    };
  }
}

function assertParticipantRole(value: string): ParticipantRole {
  if (value !== 'SENDER' && value !== 'RECEIVER') {
    throw new Error(`Unexpected ParticipantRole from DB: ${value}`);
  }
  return value;
}
