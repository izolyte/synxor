import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { CenteredScreen } from "~/shared/components/CenteredScreen";
import { ScreenColumn } from "~/shared/components/ScreenColumn";
import { ScreenHeader } from "~/shared/components/ScreenHeader";
import { roomSessionService } from "~/features/room/services/room-session.service";
import { drainSharedCache, sharedIntake } from "~/features/room/services/shared-intake.service";
import { DEFAULT_EXPIRY } from "~/features/room/constants/expiry";

export const Route = createFileRoute("/share")({
  // The service worker redirects here after stashing a share; the id points at the
  // stashed payload in the Cache. A direct visit has no id and just bounces home.
  validateSearch: (search: Record<string, unknown>): { shareId?: string } =>
    typeof search["share-id"] === "string" ? { shareId: search["share-id"] } : {},
  component: SharePage,
});

/**
 * The Web Share Target landing. Drains the shared payload the service worker
 * stashed, opens a fresh Room for it, and drops the sharer straight into it with
 * the composer pre-filled and any files queued. A pure transit screen — it renders
 * a brief "preparing" state, then navigates away (replacing itself in history so
 * Back doesn't re-run the share).
 */
function SharePage() {
  const { shareId } = Route.useSearch();
  const { trpc } = Route.useRouteContext();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  const create = useMutation(
    trpc.room.create.mutationOptions({
      onSuccess: ({ roomCode, roomToken, expiresAt }) => {
        roomSessionService.storeNewSender(roomCode, roomToken, expiresAt);
        navigate({ to: "/room/$roomCode", params: { roomCode }, replace: true });
      },
      onError: () => setFailed(true),
    }),
  );

  useEffect(() => {
    // Guard against a double run — one share is consumed once.
    if (started.current) return;
    started.current = true;

    void (async () => {
      const payload = shareId ? await drainSharedCache(shareId) : null;
      // Nothing to share (direct visit, expired stash) — send them to the landing.
      if (!payload || (!payload.text && payload.files.length === 0)) {
        navigate({ to: "/", replace: true });
        return;
      }
      sharedIntake.set(payload);
      create.mutate({ expiry: DEFAULT_EXPIRY });
    })();
    // create/navigate are stable for this one-shot; deps intentionally empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <CenteredScreen>
      <ScreenColumn>
        {failed ? (
          <>
            <ScreenHeader
              title="Couldn't open a room"
              description="Something went wrong preparing your shared content. Try opening a room yourself."
            />
            <Link to="/" replace className="text-primary text-sm font-medium no-underline">
              Go to synxor <span aria-hidden="true">→</span>
            </Link>
          </>
        ) : (
          <ScreenHeader title="Sharing to synxor" description="Preparing your room…" />
        )}
      </ScreenColumn>
    </CenteredScreen>
  );
}
