import { Inject, Injectable } from '@nestjs/common';
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
export class RoomPresenceService {
  constructor(
    @Inject(PARTICIPANT_REPOSITORY) private readonly participants: ParticipantRepository,
  ) {}

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
