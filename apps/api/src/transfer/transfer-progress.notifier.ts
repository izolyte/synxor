import { Inject, Injectable } from '@nestjs/common';
import { ROOM_BROADCASTER, type RoomBroadcaster } from '../room/room-broadcaster';
import type { UploadSession } from '../domain/transfer/upload-session';
import { TransferEvent, type TransferProgressPayload } from './transfer-events';

// Owns the transfer:progress wire payload, so the upload service doesn't know
// what the socket contract looks like.
@Injectable()
export class TransferProgressNotifier {
  constructor(@Inject(ROOM_BROADCASTER) private readonly broadcaster: RoomBroadcaster) {}

  chunkReceived(session: UploadSession, receivedChunks: number, complete: boolean): void {
    const payload: TransferProgressPayload = {
      transferId: session.transferId,
      fileName: session.fileName,
      fileSizeBytes: session.fileSizeBytes,
      receivedChunks,
      totalChunks: session.totalChunks,
      complete,
    };
    this.broadcaster.emitToRoom(session.roomId, TransferEvent.Progress, payload);
  }
}
