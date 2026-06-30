import type { Participant, CreateParticipantInput, ParticipantRole } from './participant.entity';

export const PARTICIPANT_REPOSITORY = Symbol('PARTICIPANT_REPOSITORY');

export interface ParticipantRepository {
  create(input: CreateParticipantInput): Promise<Participant>;
  findByTokenHash(hash: string): Promise<Participant | null>;
  findByRoomId(roomId: string): Promise<Participant[]>;
  setDisconnected(id: string, at: Date): Promise<Participant>;
  countConnected(roomId: string, role?: ParticipantRole): Promise<number>;
}
