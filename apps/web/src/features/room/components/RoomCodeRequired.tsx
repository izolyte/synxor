import { Link } from "@tanstack/react-router";
import { ScreenHeader } from "~/shared/components/ScreenHeader";
import { buttonVariants } from "~/shared/ui/button";
import { cn } from "~/shared/utils/cn";

/**
 * Landing on /room/<code> with no held Room session — a shared link opened on a
 * device or tab that never joined. The URL alone can't admit anyone (the per-tab
 * Room Token does), so instead of a dead 404 we hand the visitor the way in: join
 * with the Room Code (prefilled from the link they followed), or start their own
 * Room.
 */
export function RoomCodeRequired({ roomCode }: { roomCode: string }) {
  return (
    <>
      <ScreenHeader
        title="Room Code required"
        description="You'll need the Room Code to open this Room — the characters from the invite. Join with it below, or start a Room of your own."
      />
      <Link
        to="/join"
        search={{ code: roomCode }}
        className={cn(buttonVariants(), "w-full text-base")}
      >
        Join with the code
      </Link>
      <Link
        to="/"
        className={cn(buttonVariants({ variant: "outline" }), "w-full text-base")}
      >
        Create a new Room
      </Link>
    </>
  );
}
