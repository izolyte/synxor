import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { roomSessionService } from "~/features/room/services/room-session.service";
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
      onSuccess: ({ roomCode, roomToken, expiresAt }) => {
        // Persist the session before navigating; the Room view reads it back by
        // code, so the secret never travels in the URL and the countdown has its
        // expiry on reload.
        roomSessionService.store(roomCode, { token: roomToken, expiresAt, role: "sender" });
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
