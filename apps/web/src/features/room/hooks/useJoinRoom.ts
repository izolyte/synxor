import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { roomTokenService } from "~/features/room/services/room-token.service";
import type { JoinError } from "~/features/room/types/join-error";

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
        roomTokenService.store(roomCode, roomToken);
        // @ts-expect-error /room/$roomCode lands in a later issue (Room view route); remove this once its route file exists.
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

// A tRPC error carrying no structured data never reached the server (offline, DNS,
// timeout); surface that as retryable rather than blaming the code. Anything the
// server actually answered (a 4xx/5xx with data) is a rejected code.
function classifyJoinError(error: unknown): JoinError {
  if (error instanceof TRPCClientError && error.data == null) return "network";
  return "rejected";
}
