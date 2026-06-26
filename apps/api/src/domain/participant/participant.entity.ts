export type ParticipantRole = 'SENDER' | 'RECEIVER';

export interface Participant {
  id: string;
  roomId: string;
  role: ParticipantRole;
  tokenHash: string;
  joinedAt: Date;
  disconnectedAt: Date | null;
}

export interface CreateParticipantInput {
  roomId: string;
  role: ParticipantRole;
  tokenHash: string;
}
