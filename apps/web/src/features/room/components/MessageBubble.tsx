import {
  Check,
  Copy,
  Download,
  ExternalLink,
  File as FileIcon,
  Link as LinkIcon,
} from "lucide-react";
import type { TransferAuthor } from "~/features/room/constants/transfer";
import type { TransferLogRow } from "~/features/room/utils/transfer-log";
import { formatFileSize } from "~/features/room/utils/format-file-size";
import { formatTransferTime } from "~/features/room/utils/format-time";
import { buttonVariants } from "~/shared/ui/button";
import { cn } from "~/shared/utils/cn";

// Minimal author label for #99: the Participant's role. #102 swaps this for the
// generated colour + name; the stream is already author-keyed, so it slots in
// here.
function authorLabel(author: TransferAuthor | null): string {
  if (!author) return "Participant";
  return author.role === "SENDER" ? "Sender" : "Receiver";
}

/**
 * One message in the Room stream. This client's own messages align right in a
 * solid bubble; everyone else's align left in a card, captioned with who sent it.
 * The three payloads read distinctly: a Text Snippet is plain wrapped text, a
 * Link is an open-in-new-tab card, a file is a download row. `onCopy` copies a
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
      {!row.mine && (
        <span className="px-1 text-xs font-medium text-[var(--color-ink-muted)]">
          {authorLabel(row.author)}
        </span>
      )}

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

      <span
        className={cn(
          "flex items-center gap-1 px-1 text-xs text-[var(--color-ink-muted)]",
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

  if (row.kind === "file") {
    return (
      <div className="flex items-center gap-2">
        <FileIcon aria-hidden="true" size={20} className="shrink-0 opacity-80" />
        <span dir="auto" title={row.name} className="min-w-0 flex-1 truncate">
          {row.name}
        </span>
        {row.sizeBytes !== undefined && (
          <span className="shrink-0 text-xs opacity-70">{formatFileSize(row.sizeBytes)}</span>
        )}
        {row.href ? (
          <a href={row.href} download={row.name} aria-label={`Download ${row.name}`} className={action}>
            <Download aria-hidden="true" size={16} />
            Download
          </a>
        ) : (
          <span className="shrink-0 text-xs opacity-70">Receiving…</span>
        )}
      </div>
    );
  }

  if (row.kind === "link") {
    const url = row.content ?? row.name;
    return (
      <div className="flex items-center gap-2">
        <LinkIcon aria-hidden="true" size={18} className="shrink-0 opacity-80" />
        <span dir="auto" title={url} className="min-w-0 flex-1 truncate underline underline-offset-2">
          {url}
        </span>
        <a href={url} target="_blank" rel="noreferrer" aria-label={`Open ${url}`} className={action}>
          <ExternalLink aria-hidden="true" size={16} />
          Open
        </a>
      </div>
    );
  }

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
