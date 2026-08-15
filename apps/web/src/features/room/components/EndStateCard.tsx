import type { ReactNode } from "react";
import { cn } from "~/shared/utils/cn";

// Warning for a Room that's gone (expired/closed), neutral for one that's still
// live but just needs its code — the only two tones an end-state lands on.
const TONE_TILE = {
  warning: "bg-[var(--color-warning-subtle)] text-[var(--color-warning-text)]",
  neutral: "bg-[var(--color-bg-subtle)] text-[var(--color-ink-muted)]",
} as const;

/**
 * The end-state card the app lands on when a Room is over or can't be opened: a
 * tinted icon tile, a heading, a line of copy, the way forward, and a quiet
 * footnote. One composition for the expired/closed notices and the no-session
 * helper, so the layout and spacing are defined once. `announce` flags the copy
 * as a live status — the terminal notices use it so a screen reader calls out
 * that the Room just died; the code helper is passive.
 */
export function EndStateCard({
  tone,
  icon,
  title,
  message,
  announce = false,
  footNote,
  children,
}: {
  tone: keyof typeof TONE_TILE;
  icon: ReactNode;
  title: string;
  message: string;
  announce?: boolean;
  footNote: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center px-10 py-[52px] text-center">
      <span
        aria-hidden="true"
        className={cn(
          "mb-[22px] grid size-14 place-items-center rounded-[15px] [&_svg]:size-[26px]",
          TONE_TILE[tone],
        )}
      >
        {icon}
      </span>
      <h1 className="text-foreground text-[1.3rem] font-semibold tracking-[var(--tracking-tight)]">
        {title}
      </h1>
      <p
        {...(announce ? { role: "status" } : {})}
        className="text-muted-foreground mt-3 mb-[26px] max-w-[30rem] text-sm leading-[1.55] text-pretty"
      >
        {message}
      </p>
      {children}
      <p className="mt-5 font-mono text-[10.5px] tracking-[0.06em] text-[var(--color-ink-subtle)] uppercase">
        {footNote}
      </p>
    </div>
  );
}
