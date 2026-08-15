import { Link } from "@tanstack/react-router";
import { CenteredScreen } from "~/shared/components/CenteredScreen";
import { ScreenColumn } from "~/shared/components/ScreenColumn";
import { ScreenHeader } from "~/shared/components/ScreenHeader";
import { CreateRoomForm } from "~/features/room/components/CreateRoomForm";
import { buttonVariants } from "~/shared/ui/button";
import { cn } from "~/shared/utils/cn";
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

        {/* Creating is the primary action; a Receiver who already has a code takes
            the secondary path to the Join Room code entry rather than starting one. */}
        <Link to="/join" className={cn(buttonVariants({ variant: "outline" }), "w-full text-base")}>
          Join a Room
        </Link>
      </ScreenColumn>
    </CenteredScreen>
  );
}
