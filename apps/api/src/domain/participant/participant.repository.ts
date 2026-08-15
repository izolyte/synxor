import type { Participant, CreateParticipantInput, ParticipantRole } from './participant.entity';

export const PARTICIPANT_REPOSITORY = Symbol('PARTICIPANT_REPOSITORY');

export interface ParticipantRepository {
  create(input: CreateParticipantInput): Promise<Participant>;
  findByRoomId(roomId: string): Promise<Participant[]>;
  // Batched author lookup for the Transfer Log: resolves a set of authoring
  // Participants in one round-trip instead of one per Transfer.
  findByIds(ids: string[]): Promise<Participant[]>;
  // The current edited name for an identity (roomId + tokenHash), or null. Keyed
  // on the stable tokenHash, not a connection row, so it survives reconnect.
  findDisplayName(roomId: string, tokenHash: string): Promise<string | null>;
  // Sets (or clears, with null) the edited name across every connection row of an
  // identity, so all of a Participant's Transfers resolve to the new name.
  setDisplayName(roomId: string, tokenHash: string, displayName: string | null): Promise<void>;
  setDisconnected(id: string, at: Date): Promise<Participant>;
  countConnected(roomId: string, role?: ParticipantRole): Promise<number>;
  /**
   * Marks every still-connected Participant disconnected, returning how many
   * rows were swept. Used once at startup to clear rows orphaned by an
   * ungraceful shutdown (crash, redeploy), which never fired a leave.
   */
  markAllDisconnected(at: Date): Promise<number>;
}
