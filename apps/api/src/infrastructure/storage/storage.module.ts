import { Module } from '@nestjs/common';
import { MinioModule } from './minio/minio.module';

@Module({
  imports: [MinioModule],
  exports: [MinioModule],
})
export class StorageModule {}
