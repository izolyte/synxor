import { Fragment, useEffect, useRef } from "react";
import { MessageBubble } from "~/features/room/components/MessageBubble";
import type { TransferLogRow } from "~/features/room/utils/transfer-log";

// Day-boundary label for a divider: "Today"/"Yesterday" for the common case, a
// short date once the session has actually spanned days (a 7-day Room left open).
const dayFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayLabel(ms: number): string {
  const diffDays = Math.round((startOfDay(Date.now()) - startOfDay(ms)) / 86_400_000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return dayFormat.format(ms);
}

/**
 * The Room stream: every Transfer in the session — files, Text Snippets, Links —
 * as one chronological feed both Participants share. This client's own messages
 * align right, everyone else's left. A day divider heads each new calendar day
 * (mostly a single "Today" for a short-lived Room). Fills the height it's given and
 * scrolls, pinning to the newest message as the conversation grows.
 */
export function RoomStream({
  rows,
  onCopy,
}: {
  rows: TransferLogRow[];
  onCopy?: (value: string) => void;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const count = rows.length;

  // Follow the conversation: jump to the newest message whenever one arrives.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [count]);

  if (count === 0) {
    return (
      <section
        aria-label="Room stream"
        className="flex flex-1 flex-col items-center justify-center text-center"
      >
        <p className="text-muted-foreground text-sm text-pretty">
          No messages yet. Send text, a link, or a file to start.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Room stream" className="flex-1 overflow-y-auto px-3">
      <ul role="list" className="flex flex-col gap-3 py-3">
        {rows.map((row, i) => {
          const newDay = i === 0 || startOfDay(row.receivedAt) !== startOfDay(rows[i - 1].receivedAt);
          return (
            <Fragment key={row.id}>
              {newDay && <DayDivider ms={row.receivedAt} />}
              <MessageBubble row={row} onCopy={onCopy} />
            </Fragment>
          );
        })}
      </ul>
      <div ref={endRef} />
    </section>
  );
}

// A hairline rule with the day centred on it — a quiet chronological anchor in the
// mono face, matching the machine-metadata treatment of the timestamps it groups.
function DayDivider({ ms }: { ms: number }) {
  return (
    <li role="separator" aria-label={dayLabel(ms)} className="flex items-center gap-2.5 py-1">
      <span aria-hidden="true" className="h-px flex-1 bg-[var(--border)]" />
      <span
        aria-hidden="true"
        className="font-mono text-[0.625rem] uppercase tracking-[var(--tracking-wider)] text-[var(--color-ink-subtle)]"
      >
        {dayLabel(ms)}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-[var(--border)]" />
    </li>
  );
}
