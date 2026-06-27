import { Module } from '@nestjs/common';
import { PersistenceModule } from '../infrastructure/persistence/persistence.module';
import { SecurityModule } from '../infrastructure/security/security.module';
import { RoomService } from './room.service';

@Module({
  imports: [PersistenceModule, SecurityModule],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}
