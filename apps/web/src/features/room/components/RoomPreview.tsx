import { Check, Clock, X } from "lucide-react";

// A muted avatar for the imagined other participant. Issue #102 owns the violet
// identity palette; until then this stays on a neutral token so the mock never
// ships a colour it doesn't mean.
function PeerAvatar({ className }: { className?: string }) {
  return (
    <span
      className={
        "bg-secondary text-secondary-foreground grid h-[25px] w-[25px] place-items-center rounded-full font-mono text-[9.5px] font-semibold " +
        (className ?? "")
      }
    >
      IH
    </span>
  );
}

/**
 * Decorative live-Room preview beside the landing hero — a frozen still of a room
 * mid-conversation, so the front door shows what it opens onto. Purely visual:
 * aria-hidden, no focusable controls, and dropped below the two-column breakpoint.
 */
export function RoomPreview() {
  return (
    <div
      aria-hidden="true"
      className="bg-background hidden overflow-hidden rounded-[18px] border border-[var(--color-border-strong)] shadow-[var(--shadow-xl)] min-[900px]:block"
    >
      <div className="border-border flex items-center gap-[10px] border-b px-[13px] py-[11px]">
        <span className="bg-primary text-primary-foreground grid h-[28px] w-[28px] place-items-center rounded-[8px] shadow-[var(--shadow-sm)]">
          <X size={15} strokeWidth={2.4} />
        </span>
        <span className="flex min-w-0 flex-col gap-px">
          <span className="font-mono text-[13px] font-medium tracking-[0.06em]">K9F3TQ</span>
          <span className="font-mono text-[10px] tracking-[0.03em] text-[var(--color-ink-subtle)]">
            2 here
          </span>
        </span>
        <span className="flex-1" />
        <span className="text-muted-foreground border-border inline-flex items-center gap-[6px] rounded-full border bg-[var(--color-bg-subtle)] px-[10px] py-[5px] font-mono text-[12px] tabular-nums">
          <Clock size={13} className="opacity-80" />
          05:22:18
        </span>
      </div>

      <div className="flex h-[230px] flex-col gap-[11px] overflow-hidden px-[13px] pt-[15px] pb-[6px]">
        {/* Incoming text */}
        <div className="flex max-w-[86%] gap-2">
          <PeerAvatar className="self-end" />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-muted-foreground pl-[2px] text-[11px] font-medium">
              Indigo Heron
            </span>
            <div className="bg-card border-border text-foreground rounded-[15px] rounded-bl-[5px] border px-3 py-2 text-[13.5px] leading-[1.45] shadow-[var(--shadow-sm)]">
              here&apos;s the deck + the link
            </div>
          </div>
        </div>

        {/* Incoming link card */}
        <div className="flex max-w-[86%] gap-2">
          <span className="w-[25px] shrink-0" />
          <div className="bg-card border-border max-w-[250px] overflow-hidden rounded-[13px] border shadow-[var(--shadow-sm)]">
            <div className="h-[62px] bg-[linear-gradient(120deg,var(--primary),var(--color-primary-muted))] opacity-90" />
            <div className="px-[11px] py-2">
              <div className="text-[12px] leading-[1.3] font-medium">
                How we redesigned the Linear UI
              </div>
              <div className="mt-[3px] font-mono text-[9.5px] text-[var(--color-ink-subtle)]">
                linear.app
              </div>
            </div>
          </div>
        </div>

        {/* Own message, seen */}
        <div className="ml-auto flex max-w-[86%] flex-row-reverse gap-2">
          <div className="flex min-w-0 flex-col items-end gap-1">
            <div className="bg-primary text-primary-foreground rounded-[15px] rounded-br-[5px] px-3 py-2 text-[13.5px] leading-[1.45] shadow-[var(--shadow-sm)]">
              got it — sending the logo now
            </div>
            <span className="inline-flex items-center gap-[5px] px-[2px] font-mono text-[9.5px] text-[var(--color-ink-subtle)] tabular-nums">
              <span className="inline-flex text-[var(--color-success)]">
                <Check size={12} strokeWidth={2.6} />
              </span>
              Seen
            </span>
          </div>
        </div>

        {/* Peer typing */}
        <div className="flex items-end gap-2">
          <PeerAvatar />
          <div className="bg-card border-border flex gap-1 rounded-[15px] rounded-bl-[5px] border px-3 py-[10px] shadow-[var(--shadow-sm)]">
            {[0, 0.18, 0.36].map((delay) => (
              <span
                key={delay}
                className="h-[6px] w-[6px] rounded-full bg-[var(--color-ink-subtle)] motion-safe:animate-[landing-typing_1.3s_var(--ease-out)_infinite]"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
