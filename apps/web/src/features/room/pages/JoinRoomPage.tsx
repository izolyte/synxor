import { useId } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Wordmark } from "~/shared/components/Wordmark";
import { CenteredScreen } from "~/shared/components/CenteredScreen";
import { JoinRoomForm } from "~/features/room/components/JoinRoomForm";
import { useJoinRoom } from "~/features/room/hooks/useJoinRoom";

const route = getRouteApi("/join");

/**
 * Receiver-facing page: the brand join lockup (eyebrow, heading, sub) over the
 * Room Code field, wired to the join-room use-case. Centered, single column —
 * composition and type follow the join artifact.
 */
export function JoinRoomPage() {
  const { join, isPending, error, reset } = useJoinRoom();
  const { code } = route.useSearch();
  // Owned here so the visible sub-copy and the field's aria-describedby share one id.
  const hintId = useId();

  return (
    <CenteredScreen>
      <div className="flex w-full max-w-[24rem] flex-col items-center text-center">
        <Wordmark className="text-[11px] text-[var(--color-ink-subtle)]">Join a room</Wordmark>
        <h1 className="text-foreground mt-3.5 text-lg font-semibold tracking-[var(--tracking-tight)]">
          Enter the code
        </h1>
        <p id={hintId} className="text-muted-foreground mt-2 text-sm text-pretty">
          Six characters from whoever made the room.
        </p>

        <div className="mt-6 w-full">
          <JoinRoomForm
            onJoin={join}
            pending={isPending}
            error={error}
            onErrorClear={reset}
            hintId={hintId}
            initialCode={code}
          />
        </div>
      </div>
    </CenteredScreen>
  );
}
