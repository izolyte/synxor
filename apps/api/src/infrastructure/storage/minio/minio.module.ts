import { Module } from '@nestjs/common';
import { OBJECT_STORAGE } from '../../../domain/storage/object-storage';
import { MinioService } from './minio.service';

@Module({
  providers: [MinioService, { provide: OBJECT_STORAGE, useExisting: MinioService }],
  exports: [MinioService, OBJECT_STORAGE],
})
export class MinioModule {}
