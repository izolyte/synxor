import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Delivery as PrismaDelivery } from '@prisma/client';
import type { Delivery } from '../../../domain/delivery/delivery.entity';
import type { CreateDeliveryInput } from '../../../domain/delivery/delivery.entity';
import type { DeliveryRepository } from '../../../domain/delivery/delivery.repository';
import { DuplicateDeliveryError } from '../../../domain/delivery/delivery.errors';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaDeliveryRepository implements DeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateDeliveryInput): Promise<Delivery> {
    try {
      return this.toEntity(await this.prisma.delivery.create({ data: input }));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new DuplicateDeliveryError(input.transferId);
      }
      throw err;
    }
  }

  async findByTransferId(transferId: string): Promise<Delivery | null> {
    const d = await this.prisma.delivery.findUnique({ where: { transferId } });
    return d ? this.toEntity(d) : null;
  }

  private toEntity(d: PrismaDelivery): Delivery {
    return {
      id: d.id,
      transferId: d.transferId,
      deliveredAt: d.deliveredAt,
      createdAt: d.createdAt,
    };
  }
}
