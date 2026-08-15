import { Download, File as FileIcon } from "lucide-react";
import type { TransferLogRow } from "~/features/room/utils/transfer-log";
import { formatFileSize } from "~/features/room/utils/format-file-size";
import { cn } from "~/shared/utils/cn";

// The trailing extension, upper-cased, for the "2.1 MB · PDF" caption. No dot or
// no extension (a bare name, a dotfile) drops the type half rather than showing a
// stray separator.
function fileTypeLabel(name: string): string | null {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return null;
  return name.slice(dot + 1).toUpperCase();
}

/**
 * A file Transfer as a download card: an icon tile, the name, a mono size · type
 * caption, and a download action. Its own bordered surface (like LinkCard), so it
 * sits outside the text bubble. Own files tint toward the primary; others keep the
 * neutral raised surface — alignment (own right, others left), the author caption,
 * and the "Seen" tick all stay on the row scaffolding around it. While the file is
 * still streaming there's no href yet, so the action reads "Receiving…".
 */
export function FileCard({ row, mine }: { row: TransferLogRow; mine: boolean }) {
  const type = fileTypeLabel(row.name);
  const caption = [row.sizeBytes !== undefined ? formatFileSize(row.sizeBytes) : null, type]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={cn(
        "flex min-w-[13rem] max-w-[min(20rem,80%)] items-center gap-2.5 rounded-[var(--radius-lg)] border px-2.5 py-2 shadow-[var(--shadow-sm)]",
        mine
          ? "border-[color-mix(in_oklab,var(--color-primary)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-primary)_15%,var(--color-surface-raised))] text-[var(--color-ink)]"
          : "border-[var(--border)] bg-[var(--color-surface-raised)] text-[var(--color-ink)]",
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-background)] text-[var(--color-primary)]"
      >
        <FileIcon size={16} />
      </span>

      <div className="min-w-0 flex-1">
        <div dir="auto" title={row.name} className="truncate text-[0.8rem] font-medium">
          {row.name}
        </div>
        {caption && (
          <div className="mt-0.5 font-mono text-[0.625rem] tabular-nums text-[var(--color-ink-subtle)]">
            {caption}
          </div>
        )}
      </div>

      {row.href ? (
        <a
          href={row.href}
          download={row.name}
          aria-label={`Download ${row.name}`}
          className="focus-ring grid size-[26px] shrink-0 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-ink)]"
        >
          <Download aria-hidden="true" size={14} />
        </a>
      ) : (
        <span className="shrink-0 pr-1 text-xs text-[var(--color-ink-subtle)]">Receiving…</span>
      )}
    </div>
  );
}
