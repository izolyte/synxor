import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaRoomRepository } from './repositories/prisma-room.repository';
import { PrismaParticipantRepository } from './repositories/prisma-participant.repository';
import { PrismaTransferRepository } from './repositories/prisma-transfer.repository';
import { PrismaDeliveryRepository } from './repositories/prisma-delivery.repository';
import { ROOM_REPOSITORY } from '../../domain/room/room.repository';
import { PARTICIPANT_REPOSITORY } from '../../domain/participant/participant.repository';
import { TRANSFER_REPOSITORY } from '../../domain/transfer/transfer.repository';
import { DELIVERY_REPOSITORY } from '../../domain/delivery/delivery.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: ROOM_REPOSITORY, useClass: PrismaRoomRepository },
    { provide: PARTICIPANT_REPOSITORY, useClass: PrismaParticipantRepository },
    { provide: TRANSFER_REPOSITORY, useClass: PrismaTransferRepository },
    { provide: DELIVERY_REPOSITORY, useClass: PrismaDeliveryRepository },
  ],
  exports: [ROOM_REPOSITORY, PARTICIPANT_REPOSITORY, TRANSFER_REPOSITORY, DELIVERY_REPOSITORY],
})
export class PersistenceModule {}
