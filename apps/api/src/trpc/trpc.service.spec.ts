import { TrpcService } from './trpc.service';
import { RoomRouter } from './routers/room.router';
import { t } from './trpc';
import type { RoomService } from '../room/room.service';

describe('TrpcService', () => {
  it('composes the room router under the "room" namespace', async () => {
    const roomService = {
      create: jest.fn().mockResolvedValue({ roomCode: 'ABC123', roomToken: 'tok' }),
    };
    const roomRouter = new RoomRouter(roomService as unknown as RoomService);
    const trpcService = new TrpcService(roomRouter);

    const caller = t.createCallerFactory(trpcService.appRouter)({});
    const result = await caller.room.create({ expiry: '1h' });

    expect(roomService.create).toHaveBeenCalledWith('1h');
    expect(result).toEqual({ roomCode: 'ABC123', roomToken: 'tok' });
  });
});
