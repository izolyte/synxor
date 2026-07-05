import {
  ArrowLeftRight,
  Ban,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  File as FileIcon,
  Link as LinkIcon,
  Type,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { formatFileSize } from "~/features/room/utils/format-file-size";
import { buttonVariants } from "~/shared/ui/button";
import { cn } from "~/shared/utils/cn";

export type TransferKind = "file" | "snippet" | "link";
export type TransferStatus = "queued" | "in_progress" | "delivered" | "failed" | "cancelled";

export interface TransferRowData {
  id: string;
  kind: TransferKind;
  /** Filename for a file, the URL for a link, a short preview for a snippet. */
  name: string;
  status: TransferStatus;
  /** Files only — drives the size column. */
  sizeBytes?: number;
  /** Download URL (file) or destination URL (link). */
  href?: string;
  /** Snippet text handed to the copy action. */
  value?: string;
}

const PAYLOAD_ICON: Record<TransferKind, LucideIcon> = {
  file: FileIcon,
  snippet: Type,
  link: LinkIcon,
};

// Pairs every status with an icon and a text label so the state never rides on
// color alone (docs/design/16-accessibility.md). Saturated fills carry white
// ink; the resting states (queued, cancelled) read as a quiet outline instead.
const STATUS: Record<TransferStatus, { label: string; Icon: LucideIcon; className: string }> = {
  queued: {
    label: "Queued",
    Icon: Clock,
    className: "border border-[var(--border)] text-[var(--color-ink-muted)]",
  },
  in_progress: {
    label: "In progress",
    Icon: ArrowLeftRight,
    className: "bg-[var(--color-transfer-progress)] text-[var(--color-ink-on-primary)]",
  },
  delivered: {
    label: "Delivered",
    Icon: CheckCircle2,
    className: "bg-[var(--color-transfer-delivered)] text-[var(--color-ink-on-accent)]",
  },
  failed: {
    label: "Failed",
    Icon: XCircle,
    className: "bg-[var(--color-transfer-failed)] text-[var(--color-ink-on-error)]",
  },
  cancelled: {
    label: "Cancelled",
    Icon: Ban,
    className: "border border-[var(--border)] text-[var(--color-ink-muted)]",
  },
};

function TransferStatusPill({ status }: { status: TransferStatus }) {
  const { label, Icon, className } = STATUS[status];
  return (
    <span
      aria-label={`Status: ${label}`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-full)] px-2 py-0.5",
        "text-[length:var(--text-xs)] font-medium tracking-[var(--tracking-wider)]",
        className,
      )}
    >
      <Icon aria-hidden="true" size={12} />
      {label}
    </span>
  );
}

// The affordance follows the payload: pull a file, open a link, copy a snippet.
// A link/download is an anchor (native behaviour, right-click, streamed
// download); copy is a button since it acts in place.
function TransferRowAction({
  transfer,
  onCopy,
}: {
  transfer: TransferRowData;
  onCopy?: (value: string) => void;
}) {
  const action = cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0");

  if (transfer.kind === "file" && transfer.href) {
    return (
      <a href={transfer.href} download={transfer.name} aria-label={`Download ${transfer.name}`} className={action}>
        <Download aria-hidden="true" size={16} />
        Download
      </a>
    );
  }
  if (transfer.kind === "link" && transfer.href) {
    return (
      <a
        href={transfer.href}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${transfer.name}`}
        className={action}
      >
        <ExternalLink aria-hidden="true" size={16} />
        Open
      </a>
    );
  }
  if (transfer.kind === "snippet" && transfer.value !== undefined) {
    const value = transfer.value;
    return (
      <button type="button" aria-label={`Copy ${transfer.name}`} onClick={() => onCopy?.(value)} className={action}>
        <Copy aria-hidden="true" size={16} />
        Copy
      </button>
    );
  }
  return null;
}

/**
 * One row in the Transfer Log: payload icon, name, size, status pill, and the
 * action that fits the payload. Presentational — the Log (#20) feeds it data
 * and wires the copy handler. Row appears with the "Transfer Log row" entrance
 * (docs/design/07-motion.md).
 */
export function TransferRow({
  transfer,
  onCopy,
}: {
  transfer: TransferRowData;
  onCopy?: (value: string) => void;
}) {
  const PayloadIcon = PAYLOAD_ICON[transfer.kind];

  return (
    <li className="motion-safe:animate-[message-in_var(--duration-normal)_var(--ease-out)] flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors hover:bg-[var(--color-bg-subtle)]">
      <PayloadIcon aria-hidden="true" size={20} className="shrink-0 text-[var(--color-ink-muted)]" />
      <span dir="auto" title={transfer.name} className="min-w-0 flex-1 truncate">
        {transfer.name}
      </span>
      {transfer.sizeBytes !== undefined && (
        <span className="hidden shrink-0 text-xs text-[var(--color-ink-muted)] sm:inline">
          {formatFileSize(transfer.sizeBytes)}
        </span>
      )}
      <TransferStatusPill status={transfer.status} />
      <TransferRowAction transfer={transfer} onCopy={onCopy} />
    </li>
  );
}
