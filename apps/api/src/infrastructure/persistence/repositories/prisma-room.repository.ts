import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Room as PrismaRoom } from '@prisma/client';
import type { Room, RoomStatus, CreateRoomInput } from '../../../domain/room/room.entity';
import type { RoomRepository } from '../../../domain/room/room.repository';
import { RoomCodeCollisionError } from '../../../domain/room/room.errors';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaRoomRepository implements RoomRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRoomInput): Promise<Room> {
    try {
      return this.toEntity(await this.prisma.room.create({ data: input }));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new RoomCodeCollisionError(input.code);
      }
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.room.delete({ where: { id } });
  }

  async findById(id: string): Promise<Room | null> {
    const room = await this.prisma.room.findUnique({ where: { id } });
    return room ? this.toEntity(room) : null;
  }

  async findByCode(code: string): Promise<Room | null> {
    const room = await this.prisma.room.findUnique({ where: { code } });
    return room ? this.toEntity(room) : null;
  }

  async updateStatus(id: string, status: RoomStatus): Promise<Room> {
    return this.toEntity(await this.prisma.room.update({ where: { id }, data: { status } }));
  }

  async findExpiredActive(): Promise<Room[]> {
    const rooms = await this.prisma.room.findMany({
      where: { status: 'ACTIVE', expiresAt: { lte: new Date() } },
    });
    return rooms.map((r) => this.toEntity(r));
  }

  private toEntity(r: PrismaRoom): Room {
    return {
      id: r.id,
      code: r.code,
      status: assertRoomStatus(r.status),
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
    };
  }
}

function assertRoomStatus(value: string): RoomStatus {
  if (value !== 'ACTIVE' && value !== 'CLOSED' && value !== 'EXPIRED') {
    throw new Error(`Unexpected RoomStatus from DB: ${value}`);
  }
  return value;
}
