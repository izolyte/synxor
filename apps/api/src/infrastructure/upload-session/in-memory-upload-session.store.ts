import { Injectable } from '@nestjs/common';
import type {
  CreateUploadSessionInput,
  UploadSession,
  UploadSessionStore,
} from '../../domain/transfer/upload-session';
import { UploadSessionNotFoundError } from '../../domain/transfer/transfer.errors';

interface MutableSession extends Omit<UploadSession, 'receivedChunks'> {
  receivedChunks: Set<number>;
  // When the session was reserved. Only the abandoned-session sweep reads it, so
  // it stays off the public UploadSession shape.
  openedAt: Date;
}

@Injectable()
export class InMemoryUploadSessionStore implements UploadSessionStore {
  private readonly sessions = new Map<string, MutableSession>();

  reserve(input: CreateUploadSessionInput, maxPerRoom: number): Promise<UploadSession | null> {
    // Synchronous count-then-set with no await in between — that is what makes
    // the cap safe against concurrent opens on a single-threaded event loop.
    let active = 0;
    for (const session of this.sessions.values()) {
      if (session.roomId === input.roomId) active++;
    }
    if (active >= maxPerRoom) return Promise.resolve(null);

    const session: MutableSession = { ...input, receivedChunks: new Set(), openedAt: new Date() };
    this.sessions.set(input.transferId, session);
    return Promise.resolve(snapshot(session));
  }

  get(transferId: string): Promise<UploadSession | null> {
    const session = this.sessions.get(transferId);
    return Promise.resolve(session ? snapshot(session) : null);
  }

  markReceived(transferId: string, chunkIndex: number): Promise<UploadSession> {
    const session = this.sessions.get(transferId);
    if (!session) return Promise.reject(new UploadSessionNotFoundError(transferId));
    session.receivedChunks.add(chunkIndex);
    return Promise.resolve(snapshot(session));
  }

  delete(transferId: string): Promise<void> {
    this.sessions.delete(transferId);
    return Promise.resolve();
  }

  findAbandoned(openedBefore: Date): Promise<UploadSession[]> {
    const stale = [...this.sessions.values()]
      .filter((session) => session.openedAt < openedBefore)
      .map(snapshot);
    return Promise.resolve(stale);
  }
}

// Callers get a stable view even if more chunks land while they hold it.
function snapshot(session: MutableSession): UploadSession {
  return { ...session, receivedChunks: new Set(session.receivedChunks) };
}
