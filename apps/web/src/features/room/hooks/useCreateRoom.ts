import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { roomTokenService } from "~/features/room/services/room-token.service";
import type { Expiry } from "~/features/room/types/expiry";

// Bound to the home route in routes/index.tsx; lets the hook read route context
// without living in the route file.
const route = getRouteApi("/");

/**
 * Create-room use-case. Exposes an intent-named API plus request status, hiding
 * the tRPC / React Query mutation shape from the view.
 */
export function useCreateRoom() {
  const { trpc } = route.useRouteContext();
  const navigate = useNavigate();

  const mutation = useMutation(
    trpc.room.create.mutationOptions({
      onSuccess: ({ roomCode, roomToken }) => {
        // Persist the Room Token before navigating; the Room view reads it back by
        // code, so the secret never travels in the URL.
        roomTokenService.store(roomCode, roomToken);
        // @ts-expect-error /room/$roomCode lands in a later issue (Room view route); remove this once its route file exists.
        navigate({ to: "/room/$roomCode", params: { roomCode } });
      },
    }),
  );

  return {
    create: (expiry: Expiry) => mutation.mutate({ expiry }),
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}
