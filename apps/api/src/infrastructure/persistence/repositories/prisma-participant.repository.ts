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

  async findByTokenHash(hash: string): Promise<Participant | null> {
    const p = await this.prisma.participant.findUnique({ where: { tokenHash: hash } });
    return p ? this.toEntity(p) : null;
  }

  async findByRoomId(roomId: string): Promise<Participant[]> {
    const participants = await this.prisma.participant.findMany({ where: { roomId } });
    return participants.map((p) => this.toEntity(p));
  }

  async setDisconnected(id: string, at: Date): Promise<Participant> {
    return this.toEntity(
      await this.prisma.participant.update({ where: { id }, data: { disconnectedAt: at } }),
    );
  }

  async countConnected(roomId: string): Promise<number> {
    return this.prisma.participant.count({ where: { roomId, disconnectedAt: null } });
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
