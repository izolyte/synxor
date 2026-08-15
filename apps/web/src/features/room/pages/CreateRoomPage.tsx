import { getRouteApi, Link } from "@tanstack/react-router";
import { CenteredScreen } from "~/shared/components/CenteredScreen";
import { ScreenColumn } from "~/shared/components/ScreenColumn";
import { ScreenHeader } from "~/shared/components/ScreenHeader";
import { CreateRoomForm } from "~/features/room/components/CreateRoomForm";
import { buttonVariants } from "~/shared/ui/button";
import { cn } from "~/shared/utils/cn";
import { useCreateRoom } from "~/features/room/hooks/useCreateRoom";

const route = getRouteApi("/");

/**
 * Sender-facing home page: composes the brand header and the Create Room form,
 * wiring the form to the create-room use-case. Route-level presentational screen.
 */
export function CreateRoomPage() {
  const { create, isPending, isError } = useCreateRoom();
  // Arrived via the "Paste text" install shortcut — point the copy at that intent.
  const { compose } = route.useSearch();

  return (
    <CenteredScreen>
      <ScreenColumn>
        <ScreenHeader
          title="New Room"
          description={
            compose === "text"
              ? "Create a Room, then paste your text or link to send it."
              : undefined
          }
        />

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
