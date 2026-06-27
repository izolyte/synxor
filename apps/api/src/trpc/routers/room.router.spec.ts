import { RoomRouter } from './room.router';
import { t } from '../trpc';
import type { RoomService } from '../../room/room.service';

function setup() {
  const roomService = {
    create: jest.fn().mockResolvedValue({ roomCode: 'ABC123', roomToken: 'tok' }),
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
});
