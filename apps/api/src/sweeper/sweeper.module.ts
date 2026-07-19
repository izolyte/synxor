import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PersistenceModule } from '../infrastructure/persistence/persistence.module';
import { StorageModule } from '../infrastructure/storage/storage.module';
import { UploadSessionModule } from '../infrastructure/upload-session/upload-session.module';
import { ExpirySweeperService } from './expiry-sweeper.service';

@Module({
  imports: [ScheduleModule.forRoot(), PersistenceModule, StorageModule, UploadSessionModule],
  providers: [ExpirySweeperService],
})
export class SweeperModule {}
