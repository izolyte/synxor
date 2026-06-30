import { Module } from '@nestjs/common';
import { PersistenceModule } from '../infrastructure/persistence/persistence.module';
import { SecurityModule } from '../infrastructure/security/security.module';
import { RoomService } from './room.service';
import { RoomGateway } from './room.gateway';
import { RoomPresenceService } from './room-presence.service';

@Module({
  imports: [PersistenceModule, SecurityModule],
  providers: [RoomService, RoomPresenceService, RoomGateway],
  exports: [RoomService],
})
export class RoomModule {}
