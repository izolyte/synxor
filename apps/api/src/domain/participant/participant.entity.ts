export type ParticipantRole = 'SENDER' | 'RECEIVER';

export interface Participant {
  id: string;
  roomId: string;
  role: ParticipantRole;
  tokenHash: string;
  // Edited display name for this identity, or null for the auto "Colour Noun".
  displayName: string | null;
  joinedAt: Date;
  disconnectedAt: Date | null;
}

export interface CreateParticipantInput {
  roomId: string;
  role: ParticipantRole;
  tokenHash: string;
  // Seeded on reconnect so a new connection row carries the identity's current
  // edited name; null (the default) for a first join or an un-renamed identity.
  displayName?: string | null;
}
