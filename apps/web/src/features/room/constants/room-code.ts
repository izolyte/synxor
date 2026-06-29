// Number of cells the Room Code entry renders, mirroring the backend
// ROOM_CODE_LENGTH (apps/api .../domain/room/room-code.ts). The tRPC contract
// types the code as a plain string, so the cell count is a UI constant rather
// than something inferable from the AppRouter.
export const ROOM_CODE_LENGTH = 6;
