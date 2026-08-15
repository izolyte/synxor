import { Link } from "@tanstack/react-router";
import { CreateRoomCard } from "~/features/room/components/CreateRoomCard";
import type { Expiry } from "~/features/room/types/expiry";

// Default lead, and the variant for the PWA "Paste text" shortcut (?compose=text):
// there's no standalone text surface, so it points the copy at opening a room first.
const LEAD =
  "Open a room for text, links and files. Share the code, talk both ways — and everything's gone when the timer runs out.";
const LEAD_PASTE =
  "Open a room, then paste your text or link to send it. Share the code, talk both ways — and everything's gone when the timer runs out.";

/**
 * The landing hero's left column: the eyebrow, headline and lead, the create card,
 * and the surfaced Join path. Creation is the caller's concern (onCreate).
 */
export function LandingHero({
  onCreate,
  pending,
  error,
  pasteIntent,
}: {
  onCreate: (expiry: Expiry) => void;
  pending: boolean;
  error: boolean;
  pasteIntent?: boolean;
}) {
  return (
    <div>
      <span className="font-mono text-[11px] font-medium tracking-[0.2em] text-[var(--color-ink-subtle)] uppercase">
        Ephemeral rooms · no account
      </span>

      <h1 className="mt-4 text-[clamp(2.4rem,6vw,4.1rem)] leading-[0.98] font-semibold tracking-[-0.04em] text-balance">
        Send it. <em className="text-primary block not-italic">It vanishes.</em>
      </h1>

      <p className="text-muted-foreground mt-[22px] max-w-[32rem] text-[clamp(1rem,1.5vw,1.15rem)] leading-[1.5]">
        {pasteIntent ? LEAD_PASTE : LEAD}
      </p>

      <CreateRoomCard onCreate={onCreate} pending={pending} error={error} />

      {/* Creating is the primary action; a Receiver who already has a code takes
          the secondary path to the Join Room code entry rather than starting one. */}
      <div className="text-muted-foreground mt-4 flex items-center gap-[10px] text-[13.5px]">
        Got a code from someone?{" "}
        <Link to="/join" className="text-primary font-medium no-underline">
          Join a room <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
