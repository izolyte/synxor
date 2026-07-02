import { Module } from '@nestjs/common';
import { PersistenceModule } from '../infrastructure/persistence/persistence.module';
import { SecurityModule } from '../infrastructure/security/security.module';
import { StorageModule } from '../infrastructure/storage/storage.module';
import { RoomModule } from '../room/room.module';
import { UPLOAD_SESSION_STORE } from '../domain/transfer/upload-session';
import { InMemoryUploadSessionStore } from '../infrastructure/upload-session/in-memory-upload-session.store';
import { RoomTokenGuard } from '../common/auth/room-token.guard';
import { ChunkedUploadService } from './chunked-upload.service';
import { TransferDownloadService } from './transfer-download.service';
import { TransferController } from './transfer.controller';

@Module({
  imports: [PersistenceModule, SecurityModule, StorageModule, RoomModule],
  controllers: [TransferController],
  providers: [
    ChunkedUploadService,
    TransferDownloadService,
    RoomTokenGuard,
    { provide: UPLOAD_SESSION_STORE, useClass: InMemoryUploadSessionStore },
  ],
})
export class TransferModule {}
