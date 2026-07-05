import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { RoomClaims, RoomTokenGuard } from '../common/auth/room-token.guard';
import { RequireRoomRole, RoomRoleGuard } from '../common/auth/room-role.guard';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { TokenRole, type TokenClaims } from '../domain/security/token-issuer';
import { CHUNK_SIZE_BYTES } from '../domain/transfer/chunking';
import { chunkUploadSchema, type ChunkUploadRequest } from './dto/chunk-upload.dto';
import { ChunkedUploadService, type AcceptChunkResult } from './chunked-upload.service';
import { TransferDownloadService } from './transfer-download.service';
import { TransferDeliveryService } from './transfer-delivery.service';
import { TransferErrorFilter } from './transfer-error.filter';

// The only slice of Multer's file object this controller reads.
interface UploadedChunk {
  buffer: Buffer;
}

@Controller('transfer')
@UseGuards(RoomTokenGuard, RoomRoleGuard)
@UseFilters(TransferErrorFilter)
export class TransferController {
  private readonly logger = new Logger(TransferController.name);

  constructor(
    private readonly uploads: ChunkedUploadService,
    private readonly downloads: TransferDownloadService,
    private readonly delivery: TransferDeliveryService,
  ) {}

  @Post('chunk')
  @RequireRoomRole(TokenRole.Sender, 'Only the Sender may upload')
  // 1 KB of slack: busboy flags a part that hits the limit exactly, and
  // validateChunk already rejects anything that isn't exactly chunk-sized.
  @UseInterceptors(FileInterceptor('chunk', { limits: { fileSize: CHUNK_SIZE_BYTES + 1024 } }))
  async uploadChunk(
    @RoomClaims() claims: TokenClaims,
    @UploadedFile() chunk: UploadedChunk | undefined,
    @Body(new ZodValidationPipe(chunkUploadSchema)) body: ChunkUploadRequest,
  ): Promise<AcceptChunkResult> {
    if (!chunk) throw new BadRequestException('Missing chunk file part');

    return this.uploads.acceptChunk({
      roomId: claims.roomId,
      ...body,
      chunk: chunk.buffer,
    });
  }

  @Get(':transferId/download')
  async download(
    @RoomClaims() claims: TokenClaims,
    @Param('transferId') transferId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const download = await this.downloads.open(transferId, claims.roomId);
    res.set({
      'Content-Type': download.mimeType,
      'Content-Length': String(download.fileSizeBytes),
      // RFC 5987 encoding so arbitrary user filenames survive the header
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(download.fileName)}`,
    });
    // 'finish' fires only once the full body has been flushed to the Receiver —
    // a client abort emits 'close' instead, so this records genuine deliveries.
    res.on('finish', () => {
      void this.delivery.confirmDelivered(transferId, claims.roomId).catch((err: unknown) => {
        this.logger.error(
          `Failed to record delivery for transfer ${transferId}`,
          err instanceof Error ? err.stack : String(err),
        );
      });
    });
    return new StreamableFile(download.stream);
  }
}
