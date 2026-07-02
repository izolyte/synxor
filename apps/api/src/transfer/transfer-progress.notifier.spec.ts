import type { RoomBroadcaster } from '../room/room-broadcaster';
import type { UploadSession } from '../domain/transfer/upload-session';
import { TransferProgressNotifier } from './transfer-progress.notifier';
import { TransferEvent } from './transfer-events';

class FakeBroadcaster implements RoomBroadcaster {
  readonly emitted: Array<{ roomId: string; event: string; payload: unknown }> = [];
  emitToRoom(roomId: string, event: string, payload: unknown): void {
    this.emitted.push({ roomId, event, payload });
  }
}

describe('TransferProgressNotifier', () => {
  it('emits transfer:progress to the session room with the full payload', () => {
    const broadcaster = new FakeBroadcaster();
    const notifier = new TransferProgressNotifier(broadcaster);
    const session: UploadSession = {
      transferId: 'transfer-1',
      roomId: 'room-1',
      fileName: 'video.mp4',
      fileSizeBytes: 100,
      mimeType: 'video/mp4',
      totalChunks: 2,
      receivedChunks: new Set([0]),
    };

    notifier.chunkReceived(session, 1, false);

    expect(broadcaster.emitted).toEqual([
      {
        roomId: 'room-1',
        event: TransferEvent.Progress,
        payload: {
          transferId: 'transfer-1',
          fileName: 'video.mp4',
          fileSizeBytes: 100,
          receivedChunks: 1,
          totalChunks: 2,
          complete: false,
        },
      },
    ]);
  });
});
