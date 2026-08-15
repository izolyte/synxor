import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import {
  PARTICIPANT_REPOSITORY,
  type ParticipantRepository,
} from '../domain/participant/participant.repository';
import type { ParticipantRole } from '../domain/participant/participant.entity';
import {
  deriveIdentity,
  sanitizeDisplayName,
  type ParticipantIdentity,
} from '../domain/participant/participant-identity';

export interface RecordJoinInput {
  roomId: string;
  role: ParticipantRole;
  tokenHash: string;
}

export interface RecordLeaveInput {
  participantId: string;
  roomId: string;
}

export interface RenameInput {
  roomId: string;
  tokenHash: string;
  displayName: string | null;
}

export interface JoinResult {
  participantId: string;
  receiverCount: number;
  identity: ParticipantIdentity;
}

export interface LeaveResult {
  receiverCount: number;
}

// Owns participant lifecycle + live receiver counting, independent of any
// transport. The gateway maps these results onto socket events.
@Injectable()
export class RoomPresenceService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RoomPresenceService.name);

  constructor(
    @Inject(PARTICIPANT_REPOSITORY) private readonly participants: ParticipantRepository,
  ) {}

  // A crash or redeploy tears down live sockets without firing their leave, so
  // their rows stay disconnectedAt=null and inflate every future receiver count.
  // The connected set only ever lives in memory, so on a fresh boot nothing is
  // truly connected — sweep the leftovers clean. Assumes a single api instance;
  // with more than one this would evict peers' live sockets, so gate it then.
  async onApplicationBootstrap(): Promise<void> {
    const swept = await this.participants.markAllDisconnected(new Date());
    if (swept > 0) {
      this.logger.log(
        `Reconciled ${swept} stale participant(s) left connected by a prior shutdown`,
      );
    }
  }

  async recordJoin(input: RecordJoinInput): Promise<JoinResult> {
    // Carry forward any name this identity was already given, so a reconnect
    // keeps its edited name and every row of the identity stays consistent.
    const displayName = await this.participants.findDisplayName(input.roomId, input.tokenHash);
    const participant = await this.participants.create({ ...input, displayName });
    const receiverCount = await this.participants.countConnected(input.roomId, 'RECEIVER');
    const identity = deriveIdentity(input.tokenHash, displayName);
    return { participantId: participant.id, receiverCount, identity };
  }

  // Edits an identity's display name for the Room's life. Persisted across every
  // connection row of the identity and returned so the caller can broadcast it.
  // A blank name clears the override, reverting to the auto "Colour Noun".
  async rename(input: RenameInput): Promise<ParticipantIdentity> {
    const displayName = sanitizeDisplayName(input.displayName);
    await this.participants.setDisplayName(input.roomId, input.tokenHash, displayName);
    return deriveIdentity(input.tokenHash, displayName);
  }

  async recordLeave(input: RecordLeaveInput): Promise<LeaveResult> {
    await this.participants.setDisconnected(input.participantId, new Date());
    const receiverCount = await this.participants.countConnected(input.roomId, 'RECEIVER');
    return { receiverCount };
  }
}
