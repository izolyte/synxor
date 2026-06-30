import { Module } from '@nestjs/common';
import { PersistenceModule } from '../infrastructure/persistence/persistence.module';
import { SecurityModule } from '../infrastructure/security/security.module';
import { RoomService } from './room.service';
import { RoomGateway } from './room.gateway';

@Module({
  imports: [PersistenceModule, SecurityModule],
  providers: [RoomService, RoomGateway],
  exports: [RoomService],
})
export class RoomModule {}
