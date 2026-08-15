import { Link } from "@tanstack/react-router";
import { EndStateCard } from "~/features/room/components/EndStateCard";
import { buttonVariants } from "~/shared/ui/button";
import { cn } from "~/shared/utils/cn";

/**
 * Landing on /room/<code> with no held Room session — a shared link opened on a
 * device or tab that never joined. The URL alone can't admit anyone (the per-tab
 * Room Token does, and for privacy it never touches the link), so instead of a
 * dead 404 we hand the visitor the way in: enter the code (prefilled from the
 * link they followed), or start a Room of their own.
 */
export function RoomCodeRequired({ roomCode }: { roomCode: string }) {
  return (
    <EndStateCard
      tone="neutral"
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.3 4.3L2.6 18a2 2 0 001.7 3h15.4a2 2 0 001.7-3L13.7 4.3a2 2 0 00-3.4 0z" />
        </svg>
      }
      title="This Room needs its code"
      message="Links don't carry the Room's key — for privacy, it never touches the URL. Join from the invite, or punch in the six-character code."
      footNote="no session on this device"
    >
      <Link
        to="/join"
        search={{ code: roomCode }}
        className={cn(buttonVariants({ variant: "outline" }), "w-auto max-w-[220px] px-5")}
      >
        Enter a code
      </Link>
      <Link
        to="/"
        className="text-muted-foreground mt-4 text-sm underline-offset-4 hover:underline"
      >
        Start a new Room
      </Link>
    </EndStateCard>
  );
}
