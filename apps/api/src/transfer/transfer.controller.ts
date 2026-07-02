import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
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
import { TokenRole, type TokenClaims } from '../domain/security/token-issuer';
import { CHUNK_SIZE_BYTES } from '../domain/transfer/chunking';
import { chunkUploadSchema } from './dto/chunk-upload.dto';
import { ChunkedUploadService, type AcceptChunkResult } from './chunked-upload.service';
import { TransferDownloadService } from './transfer-download.service';
import { TransferErrorFilter } from './transfer-error.filter';

// The only slice of Multer's file object this controller reads.
interface UploadedChunk {
  buffer: Buffer;
}

@Controller('transfer')
@UseGuards(RoomTokenGuard)
@UseFilters(TransferErrorFilter)
export class TransferController {
  constructor(
    private readonly uploads: ChunkedUploadService,
    private readonly downloads: TransferDownloadService,
  ) {}

  @Post('chunk')
  @UseInterceptors(FileInterceptor('chunk', { limits: { fileSize: CHUNK_SIZE_BYTES } }))
  async uploadChunk(
    @RoomClaims() claims: TokenClaims,
    @UploadedFile() chunk: UploadedChunk | undefined,
    @Body() body: unknown,
  ): Promise<AcceptChunkResult> {
    if (claims.role !== TokenRole.Sender) {
      throw new ForbiddenException('Only the Sender may upload');
    }
    if (!chunk) throw new BadRequestException('Missing chunk file part');

    const parsed = chunkUploadSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);

    return this.uploads.acceptChunk({
      roomId: claims.roomId,
      ...parsed.data,
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
    return new StreamableFile(download.stream);
  }
}
