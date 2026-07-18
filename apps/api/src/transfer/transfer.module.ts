import { Module } from '@nestjs/common';
import { PersistenceModule } from '../infrastructure/persistence/persistence.module';
import { SecurityModule } from '../infrastructure/security/security.module';
import { StorageModule } from '../infrastructure/storage/storage.module';
import { RoomModule } from '../room/room.module';
import { UploadSessionModule } from '../infrastructure/upload-session/upload-session.module';
import { RoomTokenGuard } from '../common/auth/room-token.guard';
import { RoomRoleGuard } from '../common/auth/room-role.guard';
import { ChunkedUploadService } from './chunked-upload.service';
import { ChunkAssembler } from './chunk-assembler';
import { TransferProgressNotifier } from './transfer-progress.notifier';
import { TransferDownloadService } from './transfer-download.service';
import { TransferDeliveryService } from './transfer-delivery.service';
import { TransferController } from './transfer.controller';
import { transferOptionsProviders } from './transfer.options';

@Module({
  imports: [PersistenceModule, SecurityModule, StorageModule, RoomModule, UploadSessionModule],
  controllers: [TransferController],
  providers: [
    ChunkedUploadService,
    ChunkAssembler,
    TransferProgressNotifier,
    TransferDownloadService,
    TransferDeliveryService,
    RoomTokenGuard,
    RoomRoleGuard,
    ...transferOptionsProviders,
  ],
})
export class TransferModule {}
