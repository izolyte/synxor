import { useId } from "react";
import { CenteredScreen } from "~/shared/components/CenteredScreen";
import { Wordmark } from "~/shared/components/Wordmark";
import { JoinRoomForm } from "~/features/room/components/JoinRoomForm";
import { useJoinRoom } from "~/features/room/hooks/useJoinRoom";

/**
 * Receiver-facing page: composes the brand header and the Join Room form, wiring
 * the form to the join-room use-case. Route-level presentational screen.
 */
export function JoinRoomPage() {
  const { join, isPending, error, reset } = useJoinRoom();
  // Owned here so the visible hint and the field's aria-describedby share one id.
  const hintId = useId();

  return (
    <CenteredScreen>
      <div className="flex w-full max-w-[var(--width-narrow)] flex-col gap-8">
        <header className="flex flex-col gap-2">
          <Wordmark>synxor</Wordmark>
          <h1 className="text-foreground text-3xl font-bold tracking-[var(--tracking-tight)]">
            Join Room
          </h1>
          <p id={hintId} className="text-muted-foreground text-sm">
            Enter the code from the sender.
          </p>
        </header>

        <JoinRoomForm
          onJoin={join}
          pending={isPending}
          error={error}
          onErrorClear={reset}
          hintId={hintId}
        />
      </div>
    </CenteredScreen>
  );
}
