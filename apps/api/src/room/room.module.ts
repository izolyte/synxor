import { Module } from '@nestjs/common';
import { PersistenceModule } from '../infrastructure/persistence/persistence.module';
import { SecurityModule } from '../infrastructure/security/security.module';
import { StorageModule } from '../infrastructure/storage/storage.module';
import { RoomService } from './room.service';
import { RoomGateway } from './room.gateway';
import { RoomPresenceService } from './room-presence.service';
import { ROOM_BROADCASTER } from './room-broadcaster';

@Module({
  imports: [PersistenceModule, SecurityModule, StorageModule],
  providers: [
    RoomService,
    RoomPresenceService,
    RoomGateway,
    { provide: ROOM_BROADCASTER, useExisting: RoomGateway },
  ],
  exports: [RoomService, ROOM_BROADCASTER],
})
export class RoomModule {}
