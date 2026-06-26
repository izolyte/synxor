import { Module } from '@nestjs/common';
import { MinioModule } from './minio/minio.module';
import { MinioService } from './minio/minio.service';

@Module({
  imports: [MinioModule],
  exports: [MinioModule],
})
export class StorageModule {}
