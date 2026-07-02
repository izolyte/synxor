import { Injectable } from '@nestjs/common';
import type {
  CreateUploadSessionInput,
  UploadSession,
  UploadSessionStore,
} from '../../domain/transfer/upload-session';
import { UploadSessionNotFoundError } from '../../domain/transfer/transfer.errors';

interface MutableSession extends Omit<UploadSession, 'receivedChunks'> {
  receivedChunks: Set<number>;
}

@Injectable()
export class InMemoryUploadSessionStore implements UploadSessionStore {
  private readonly sessions = new Map<string, MutableSession>();

  create(input: CreateUploadSessionInput): Promise<UploadSession> {
    const session: MutableSession = { ...input, receivedChunks: new Set() };
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

  countByRoom(roomId: string): Promise<number> {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.roomId === roomId) count++;
    }
    return Promise.resolve(count);
  }
}

// Callers get a stable view even if more chunks land while they hold it.
function snapshot(session: MutableSession): UploadSession {
  return { ...session, receivedChunks: new Set(session.receivedChunks) };
}
