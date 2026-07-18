import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { HOUR_MS, MINUTE_MS } from '../common/time';
import { ROOM_REPOSITORY, type RoomRepository } from '../domain/room/room.repository';
import {
  TRANSFER_REPOSITORY,
  type TransferRepository,
} from '../domain/transfer/transfer.repository';
import { OBJECT_STORAGE, type ObjectStorage } from '../domain/storage/object-storage';
import {
  UPLOAD_SESSION_STORE,
  type UploadSession,
  type UploadSessionStore,
} from '../domain/transfer/upload-session';
import { chunkObjectKey, fileObjectKey } from '../domain/transfer/storage-key';

// How often the sweep runs. A minute is well inside the resolution anyone cares
// about for a room that expires in hours, and keeps an abandoned upload from
// squatting a room's concurrency slots for longer than necessary.
export const SWEEP_INTERVAL_MS = MINUTE_MS;

// An in-flight upload untouched for longer than this is treated as abandoned —
// comfortably beyond any real chunked upload, so a slow-but-live sender is safe.
export const ABANDONED_UPLOAD_TTL_MS = HOUR_MS;

// Reaps expired Rooms and abandoned uploads on a timer. Room expiry is otherwise
// lazy (isExpired() computes it on read), so without this a past-expiry Room
// keeps its Transfer rows and MinIO objects forever. Each unit of work is
// isolated: one Room or upload failing is logged and skipped, never aborting the
// batch.
@Injectable()
export class ExpirySweeperService {
  private readonly logger = new Logger(ExpirySweeperService.name);
  private sweeping = false;

  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: RoomRepository,
    @Inject(TRANSFER_REPOSITORY) private readonly transfers: TransferRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(UPLOAD_SESSION_STORE) private readonly sessions: UploadSessionStore,
  ) {}

  @Interval(SWEEP_INTERVAL_MS)
  async sweep(): Promise<void> {
    // Skip the tick if a prior sweep is still running: a slow DB or storage pass
    // must not stack overlapping runs that fight over the same rows and keys.
    if (this.sweeping) return;
    this.sweeping = true;
    try {
      await this.expireRooms();
      await this.reapAbandonedUploads();
    } catch (err) {
      this.logger.error(`Sweep aborted: ${errorMessage(err)}`);
    } finally {
      this.sweeping = false;
    }
  }

  // Flip every ACTIVE Room past its expiry to EXPIRED and purge its objects.
  // Returns the count expired, for tests and logging.
  async expireRooms(): Promise<number> {
    const rooms = await this.rooms.findExpiredActive();
    let expired = 0;
    for (const room of rooms) {
      try {
        await this.expireRoom(room.id);
        expired++;
      } catch (err) {
        this.logger.error(`Failed to expire room ${room.id}: ${errorMessage(err)}`);
      }
    }
    return expired;
  }

  private async expireRoom(roomId: string): Promise<void> {
    // Purge storage, then the rows, then flip the status last. If any step
    // throws, the Room stays ACTIVE-but-past-expiry and the next sweep retries
    // it — isExpired() keeps it unjoinable in the gap, and removeObject over an
    // already-deleted key is a harmless no-op, so the retry is safe.
    const storageKeys = await this.transfers.listStorageKeysByRoomId(roomId);
    for (const key of storageKeys) {
      await this.storage.removeObject(key);
    }
    await this.transfers.deleteByRoomId(roomId);
    await this.rooms.updateStatus(roomId, 'EXPIRED');
  }

  // Drop upload sessions whose sender walked away, freeing the room slot and
  // clearing the partial chunk objects they left behind. Returns the count reaped.
  async reapAbandonedUploads(now: Date = new Date()): Promise<number> {
    const openedBefore = new Date(now.getTime() - ABANDONED_UPLOAD_TTL_MS);
    const abandoned = await this.sessions.findAbandoned(openedBefore);
    let reaped = 0;
    for (const session of abandoned) {
      try {
        await this.reapSession(session);
        reaped++;
      } catch (err) {
        this.logger.error(`Failed to reap upload ${session.transferId}: ${errorMessage(err)}`);
      }
    }
    return reaped;
  }

  private async reapSession(session: UploadSession): Promise<void> {
    // Clear the chunk objects that landed plus the final key in case assembly had
    // started, drop the rows the open reserved, then release the slot last — a
    // failure mid-reap leaves the session for the next sweep to retry.
    for (const chunkIndex of session.receivedChunks) {
      await this.storage.removeObject(
        chunkObjectKey(session.roomId, session.transferId, chunkIndex),
      );
    }
    await this.storage.removeObject(fileObjectKey(session.roomId, session.transferId));
    await this.transfers.deleteById(session.transferId);
    await this.sessions.delete(session.transferId);
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
