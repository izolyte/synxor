import { useId } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { CenteredScreen } from "~/shared/components/CenteredScreen";
import { ScreenColumn } from "~/shared/components/ScreenColumn";
import { ScreenHeader } from "~/shared/components/ScreenHeader";
import { JoinRoomForm } from "~/features/room/components/JoinRoomForm";
import { useJoinRoom } from "~/features/room/hooks/useJoinRoom";

const route = getRouteApi("/join");

/**
 * Receiver-facing page: composes the brand header and the Join Room form, wiring
 * the form to the join-room use-case. Route-level presentational screen.
 */
export function JoinRoomPage() {
  const { join, isPending, error, reset } = useJoinRoom();
  const { code } = route.useSearch();
  // Owned here so the visible hint and the field's aria-describedby share one id.
  const hintId = useId();

  return (
    <CenteredScreen>
      <ScreenColumn>
        <ScreenHeader
          title="Join Room"
          description="Enter the code from the sender."
          descriptionId={hintId}
        />

        <JoinRoomForm
          onJoin={join}
          pending={isPending}
          error={error}
          onErrorClear={reset}
          hintId={hintId}
          initialCode={code}
        />
      </ScreenColumn>
    </CenteredScreen>
  );
}
