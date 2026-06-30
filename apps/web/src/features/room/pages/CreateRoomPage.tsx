import { CenteredScreen } from "~/shared/components/CenteredScreen";
import { ScreenColumn } from "~/shared/components/ScreenColumn";
import { ScreenHeader } from "~/shared/components/ScreenHeader";
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
      <ScreenColumn>
        <ScreenHeader title="New Room" />

        <CreateRoomForm onCreate={create} pending={isPending} error={isError} />
      </ScreenColumn>
    </CenteredScreen>
  );
}
