import { Check, Copy } from "lucide-react";
import type { TransferAuthor } from "~/features/room/constants/transfer";
import type { TransferLogRow } from "~/features/room/utils/transfer-log";
import { hasIdentity, identityColorVar } from "~/features/room/constants/identity";
import { LinkCard } from "~/features/room/components/LinkCard";
import { FileCard } from "~/features/room/components/FileCard";
import { ParticipantAvatar } from "~/features/room/components/ParticipantAvatar";
import { formatTransferTime } from "~/features/room/utils/format-time";
import { buttonVariants } from "~/shared/ui/button";
import { cn } from "~/shared/utils/cn";

// Fallback caption when a peer has no resolved identity yet (a live file row
// before the Sender is known): the bare role, as the stream showed before #102.
function roleLabel(author: TransferAuthor | null): string {
  if (!author) return "Participant";
  return author.role === "SENDER" ? "Sender" : "Receiver";
}

// An incoming message's caption: the author's identity avatar + name in their
// colour, or a bare role label when no identity is known.
function AuthorCaption({ author }: { author: TransferAuthor | null }) {
  const identity = author?.identity;
  if (!hasIdentity(identity)) {
    return (
      <span className="px-1 text-xs font-medium text-[var(--color-ink-muted)]">
        {roleLabel(author)}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 px-1">
      <ParticipantAvatar name={identity.name} colorKey={identity.colorKey} size="sm" />
      <span
        className="text-xs font-semibold"
        style={{ color: identityColorVar(identity.colorKey) }}
      >
        {identity.name}
      </span>
    </span>
  );
}

/**
 * One message in the Room stream. This client's own messages align right in a
 * solid bubble; everyone else's align left in a card, captioned with who sent it.
 * The three payloads read distinctly: a Text Snippet is plain wrapped text, a
 * Link is an open-in-new-tab card, a file is a download card. `onCopy` copies a
 * snippet in place. A delivered marker (a tick) rides the sender's own row.
 */
export function MessageBubble({
  row,
  onCopy,
}: {
  row: TransferLogRow;
  onCopy?: (value: string) => void;
}) {
  const delivered = row.status === "delivered";

  return (
    <li
      className={cn(
        "flex flex-col gap-1 motion-safe:animate-[message-in_var(--duration-normal)_var(--ease-out)]",
        row.mine ? "items-end" : "items-start",
      )}
    >
      {!row.mine && <AuthorCaption author={row.author} />}

      {/* A Link and a file each get their own bordered card surface, so they sit
          outside the text bubble rather than inside it. */}
      {row.kind === "link" ? (
        <LinkCard url={row.content ?? row.name} />
      ) : row.kind === "file" ? (
        <FileCard row={row} mine={row.mine} />
      ) : (
        <div
          className={cn(
            "flex max-w-[min(32rem,80%)] flex-col gap-2 rounded-[var(--radius-lg)] px-3 py-2 text-sm",
            row.mine
              ? "bg-[var(--color-primary)] text-[var(--color-ink-on-primary)]"
              : "border border-[var(--border)] bg-[var(--color-surface-raised)] text-[var(--color-ink)]",
          )}
        >
          <BubbleBody row={row} mine={row.mine} onCopy={onCopy} />
        </div>
      )}

      <span
        className={cn(
          "flex items-center gap-1.5 px-1 font-mono text-[0.625rem] tabular-nums text-[var(--color-ink-subtle)]",
          row.mine ? "flex-row-reverse" : "",
        )}
      >
        <time dateTime={new Date(row.receivedAt).toISOString()} className="tabular-nums">
          {formatTransferTime(row.receivedAt)}
        </time>
        {row.mine && delivered && (
          <span aria-label="Status: Delivered" className="inline-flex items-center gap-0.5">
            <Check aria-hidden="true" size={13} />
            Seen
          </span>
        )}
      </span>
    </li>
  );
}

function BubbleBody({
  row,
  mine,
  onCopy,
}: {
  row: TransferLogRow;
  mine: boolean;
  onCopy?: (value: string) => void;
}) {
  // Actions invert on the sender's own (solid) bubble so they stay legible on the
  // filled background.
  const action = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    "shrink-0",
    mine && "border-white/40 bg-transparent text-[var(--color-ink-on-primary)] hover:bg-white/15",
  );

  // A Link and a file never reach here — MessageBubble renders each as its own
  // card, outside this shared text bubble.
  const text = row.content ?? row.name;
  return (
    <div className="flex items-end gap-2">
      <span dir="auto" className="min-w-0 flex-1 whitespace-pre-wrap break-words">
        {text}
      </span>
      <button
        type="button"
        aria-label={`Copy ${row.name}`}
        onClick={() => onCopy?.(text)}
        className={action}
      >
        <Copy aria-hidden="true" size={16} />
        Copy
      </button>
    </div>
  );
}
