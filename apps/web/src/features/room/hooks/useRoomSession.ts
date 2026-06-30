import { useEffect, useState } from "react";
import {
  roomSessionService,
  type RoomSession,
} from "~/features/room/services/room-session.service";

type RoomSessionState =
  | { status: "loading" }
  | { status: "ready"; session: RoomSession }
  | { status: "missing" };

/**
 * Reads the per-tab Room session for a code. Web Storage is client-only, so the
 * read happens after mount: SSR and the first hydration both render "loading" (same
 * markup, no mismatch), then it resolves to "ready" or "missing".
 */
export function useRoomSession(roomCode: string): RoomSessionState {
  const [state, setState] = useState<RoomSessionState>({ status: "loading" });

  useEffect(() => {
    const session = roomSessionService.get(roomCode);
    setState(session ? { status: "ready", session } : { status: "missing" });
  }, [roomCode]);

  return state;
}
