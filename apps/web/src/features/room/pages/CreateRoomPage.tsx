import { CenteredScreen } from "~/shared/components/CenteredScreen";
import { Wordmark } from "~/shared/components/Wordmark";
import { CreateRoomForm } from "~/features/room/components/CreateRoomForm";
import { useCreateRoom } from "~/features/room/hooks/useCreateRoom";

/**
 * Sender-facing home page: composes the brand header and the Create Room form,
 * wiring the form to the create-room use-case. Route-level presentational screen.
 */
export function CreateRoomPage() {
  const { create, isPending, isError } = useCreateRoom();

  return (
    <CenteredScreen>
      <div className="flex w-full max-w-[var(--width-narrow)] flex-col gap-8">
        <header className="flex flex-col gap-2">
          <Wordmark>synxor</Wordmark>
          <h1 className="text-foreground text-3xl font-bold tracking-[var(--tracking-tight)]">
            New Room
          </h1>
        </header>

        <CreateRoomForm onCreate={create} pending={isPending} error={isError} />
      </div>
    </CenteredScreen>
  );
}
