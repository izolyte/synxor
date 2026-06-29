import { RoomRouter } from './room.router';
import { t } from '../trpc';
import type { RoomService } from '../../room/room.service';
import { RoomExpiredError, RoomNotFoundError } from '../../domain/room/room.errors';

function setup() {
  const roomService = {
    create: jest.fn().mockResolvedValue({ roomCode: 'ABC123', roomToken: 'tok' }),
    join: jest.fn().mockResolvedValue({ roomToken: 'tok', roomId: 'room-1' }),
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
    expect(result).toEqual({ roomCode: 'ABC123', roomToken: 'tok' });
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
});
