import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import {
  PARTICIPANT_REPOSITORY,
  type ParticipantRepository,
} from '../domain/participant/participant.repository';
import type { ParticipantRole } from '../domain/participant/participant.entity';

export interface RecordJoinInput {
  roomId: string;
  role: ParticipantRole;
  tokenHash: string;
}

export interface RecordLeaveInput {
  participantId: string;
  roomId: string;
}

export interface JoinResult {
  participantId: string;
  receiverCount: number;
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
    const participant = await this.participants.create(input);
    const receiverCount = await this.participants.countConnected(input.roomId, 'RECEIVER');
    return { participantId: participant.id, receiverCount };
  }

  async recordLeave(input: RecordLeaveInput): Promise<LeaveResult> {
    await this.participants.setDisconnected(input.participantId, new Date());
    const receiverCount = await this.participants.countConnected(input.roomId, 'RECEIVER');
    return { receiverCount };
  }
}
