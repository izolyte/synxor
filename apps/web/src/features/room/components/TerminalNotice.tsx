import { Link } from "@tanstack/react-router";
import { CenteredScreen } from "~/shared/components/CenteredScreen";
import { EndStateCard } from "~/features/room/components/EndStateCard";
import { buttonVariants } from "~/shared/ui/button";
import { cn } from "~/shared/utils/cn";

// Expiry is a clock run down to zero; a Sender-closed Room is a circle struck
// through — both warning-tinted, because in both the conversation is gone.
const VARIANTS = {
  expired: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
    title: "This Room has expired",
    message:
      "The conversation and every file are permanently gone — that's the point. Nothing is stored, nothing to clean up.",
    footNote: "00:00:00 · nothing recoverable",
  },
  closed: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M5.6 5.6l12.8 12.8" />
      </svg>
    ),
    title: "This Room is closed",
    message: "The Sender closed this Room. Start a new Room to send more.",
    footNote: "closed by the Sender",
  },
} as const;

/**
 * The full-screen goodbye a Participant lands on once a Room is over — its Expiry
 * passed and any in-flight Transfer landed, or the Sender closed it. Terminal Room
 * states keep the app's centered layout; only the live Room takes the full-height
 * shell. Visual only: RoomShareView decides when a Room is done.
 */
export function TerminalNotice({ variant }: { variant: keyof typeof VARIANTS }) {
  const { icon, title, message, footNote } = VARIANTS[variant];
  return (
    <CenteredScreen>
      <EndStateCard tone="warning" icon={icon} title={title} message={message} footNote={footNote} announce>
        <Link
          to="/"
          className={cn(buttonVariants(), "w-auto max-w-[220px] gap-[9px] px-5 [&_svg]:size-4")}
        >
          Start a new Room
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </EndStateCard>
    </CenteredScreen>
  );
}
