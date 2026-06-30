import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { roomSessionService } from "~/features/room/services/room-session.service";
import { classifyJoinError } from "~/features/room/utils/join-error";

// Bound to the join route in routes/join.tsx; lets the hook read route context
// without living in the route file.
const route = getRouteApi("/join");

/**
 * Join-room use-case. Exposes an intent-named API plus a classified error, hiding
 * the tRPC / React Query mutation shape from the view. `reset` clears a failed
 * attempt so the form can drop its error the moment the user retypes.
 */
export function useJoinRoom() {
  const { trpc } = route.useRouteContext();
  const navigate = useNavigate();

  const mutation = useMutation(
    trpc.room.join.mutationOptions({
      // join returns { roomToken, roomId }, not the code — so the token is keyed by
      // the code the user entered (the mutation variables), same as create.
      onSuccess: ({ roomToken }, { roomCode }) => {
        // Receiver holds only the token — the join response carries no expiry, so
        // the session has no countdown source (Sender-only concern).
        roomSessionService.store(roomCode, { token: roomToken });
        navigate({ to: "/room/$roomCode", params: { roomCode } });
      },
    }),
  );

  return {
    join: (roomCode: string) => mutation.mutate({ roomCode }),
    isPending: mutation.isPending,
    error: mutation.error ? classifyJoinError(mutation.error) : null,
    reset: mutation.reset,
  };
}
