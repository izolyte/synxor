import { RoomPresenceService } from './room-presence.service';
import { InMemoryParticipantRepository } from '../domain/participant/participant.repository.fake';

describe('RoomPresenceService', () => {
  let participants: InMemoryParticipantRepository;
  let presence: RoomPresenceService;

  beforeEach(() => {
    participants = new InMemoryParticipantRepository();
    presence = new RoomPresenceService(participants);
  });

  it('records a join and returns the new participant id', async () => {
    const { participantId } = await presence.recordJoin({
      roomId: 'room-1',
      role: 'RECEIVER',
      tokenHash: 'hash-1',
    });

    expect(participantId).toBeTruthy();
    expect(participants.stored.get(participantId)?.roomId).toBe('room-1');
  });

  it('counts only connected Receivers, not the Sender, on join', async () => {
    await presence.recordJoin({ roomId: 'room-1', role: 'SENDER', tokenHash: 'sender' });

    const { receiverCount } = await presence.recordJoin({
      roomId: 'room-1',
      role: 'RECEIVER',
      tokenHash: 'rx-1',
    });

    expect(receiverCount).toBe(1);
  });

  it('scopes the count to the given room', async () => {
    await presence.recordJoin({ roomId: 'room-1', role: 'RECEIVER', tokenHash: 'a' });
    const { receiverCount } = await presence.recordJoin({
      roomId: 'room-2',
      role: 'RECEIVER',
      tokenHash: 'b',
    });

    expect(receiverCount).toBe(1);
  });

  it('marks the participant disconnected and returns the updated count on leave', async () => {
    const { participantId } = await presence.recordJoin({
      roomId: 'room-1',
      role: 'RECEIVER',
      tokenHash: 'rx-1',
    });

    const { receiverCount } = await presence.recordLeave({
      participantId,
      roomId: 'room-1',
    });

    expect(receiverCount).toBe(0);
    expect(participants.stored.get(participantId)?.disconnectedAt).not.toBeNull();
  });

  it('returns the count of the Receivers still connected when one of several leaves', async () => {
    await presence.recordJoin({ roomId: 'room-1', role: 'RECEIVER', tokenHash: 'rx-1' });
    const { participantId } = await presence.recordJoin({
      roomId: 'room-1',
      role: 'RECEIVER',
      tokenHash: 'rx-2',
    });

    const { receiverCount } = await presence.recordLeave({
      participantId,
      roomId: 'room-1',
    });

    expect(receiverCount).toBe(1);
  });
});
