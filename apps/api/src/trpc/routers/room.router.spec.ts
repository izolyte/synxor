import { RoomRouter } from './room.router';
import { t } from '../trpc';
import type { RoomService } from '../../room/room.service';
import { RoomExpiredError, RoomNotFoundError } from '../../domain/room/room.errors';

function setup() {
  const roomService = {
    create: jest.fn().mockResolvedValue({
      roomCode: 'ABC123',
      roomToken: 'tok',
      expiresAt: '2099-01-01T00:00:00.000Z',
    }),
    join: jest.fn().mockResolvedValue({ roomToken: 'tok', roomId: 'room-1' }),
    listTransfers: jest.fn().mockResolvedValue([]),
  };
  const roomRouter = new RoomRouter(roomService as unknown as RoomService);
  const caller = t.createCallerFactory(roomRouter.router)({});
  return { roomService, caller };
}

describe('RoomRouter', () => {
  it('delegates create to RoomService and returns its result', async () => {
    const { roomService, caller } = setup();
    const result = await caller.create({ expiry: '1h' });
    expect(roomService.create).toHaveBeenCalledWith('1h');
    expect(result).toEqual({
      roomCode: 'ABC123',
      roomToken: 'tok',
      expiresAt: '2099-01-01T00:00:00.000Z',
    });
  });

  it('rejects an invalid expiry before reaching the service', async () => {
    const { roomService, caller } = setup();
    await expect(caller.create({ expiry: '2h' as never })).rejects.toThrow();
    expect(roomService.create).not.toHaveBeenCalled();
  });

  it('delegates join to RoomService and returns its result', async () => {
    const { roomService, caller } = setup();
    const result = await caller.join({ roomCode: 'AB3X7Z' });
    expect(roomService.join).toHaveBeenCalledWith('AB3X7Z');
    expect(result).toEqual({ roomToken: 'tok', roomId: 'room-1' });
  });

  it('rejects a malformed Room Code before reaching the service', async () => {
    const { roomService, caller } = setup();
    await expect(caller.join({ roomCode: 'nope' })).rejects.toThrow();
    expect(roomService.join).not.toHaveBeenCalled();
  });

  it('maps a missing Room to a NOT_FOUND tRPC error', async () => {
    const { roomService, caller } = setup();
    roomService.join.mockRejectedValueOnce(new RoomNotFoundError('AB3X7Z'));
    await expect(caller.join({ roomCode: 'AB3X7Z' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('maps an expired Room to a NOT_FOUND tRPC error', async () => {
    const { roomService, caller } = setup();
    roomService.join.mockRejectedValueOnce(new RoomExpiredError('AB3X7Z'));
    await expect(caller.join({ roomCode: 'AB3X7Z' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('delegates transfers to RoomService and returns its result', async () => {
    const { roomService, caller } = setup();
    const history = [
      {
        id: 't1',
        payloadType: 'FILE' as const,
        fileName: 'video.mp4',
        fileSizeBytes: 2048,
        delivered: true,
        createdAt: '2099-01-01T00:00:00.000Z',
      },
    ];
    roomService.listTransfers.mockResolvedValueOnce(history);
    const result = await caller.transfers({ roomCode: 'AB3X7Z' });
    expect(roomService.listTransfers).toHaveBeenCalledWith('AB3X7Z');
    expect(result).toEqual(history);
  });

  it('rejects a malformed Room Code before reaching the transfers service', async () => {
    const { roomService, caller } = setup();
    await expect(caller.transfers({ roomCode: 'nope' })).rejects.toThrow();
    expect(roomService.listTransfers).not.toHaveBeenCalled();
  });

  it('maps a missing Room to a NOT_FOUND tRPC error on transfers', async () => {
    const { roomService, caller } = setup();
    roomService.listTransfers.mockRejectedValueOnce(new RoomNotFoundError('AB3X7Z'));
    await expect(caller.transfers({ roomCode: 'AB3X7Z' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
