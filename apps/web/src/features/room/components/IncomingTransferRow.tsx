import { CheckCircle2, Download, File as FileIcon } from "lucide-react";
import { TransferProgressBar } from "~/features/room/components/TransferProgressBar";
import type { TransferProgressPayload } from "~/features/room/constants/transfer";
import { formatFileSize } from "~/features/room/utils/format-file-size";
import { buttonVariants } from "~/shared/ui/button";
import { cn } from "~/shared/utils/cn";

/**
 * Receiver's view of one incoming Transfer: name, size, the Sender's live
 * progress, and a Download link. The link is enabled from the first chunk —
 * the API streams chunks as they land, so downloading before the upload
 * finishes is the point, not an edge case. A plain <a download> keeps the
 * browser's native streamed download (no blob buffering).
 *
 * `delivered` flips the row to a Delivered state once this Receiver finishes
 * pulling the file — the check + label persist after the Delivery flash fades,
 * so the confirmation never rides on the flash (or on color) alone.
 */
export function IncomingTransferRow({
  transfer,
  downloadHref,
  delivered = false,
}: {
  transfer: TransferProgressPayload;
  downloadHref: string;
  delivered?: boolean;
}) {
  const percent =
    transfer.totalChunks > 0
      ? Math.round((transfer.receivedChunks / transfer.totalChunks) * 100)
      : 0;

  return (
    <li className="motion-safe:animate-[message-in_var(--duration-normal)_var(--ease-out)] flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm">
      <FileIcon aria-hidden="true" size={20} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span dir="auto" title={transfer.fileName} className="min-w-0 flex-1 truncate">
            {transfer.fileName}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatFileSize(transfer.fileSizeBytes)}
          </span>
        </div>
        {!transfer.complete && !delivered && (
          <TransferProgressBar
            percent={percent}
            label={`Receiving ${transfer.fileName}`}
            compact
          />
        )}
      </div>
      {delivered ? (
        <span
          aria-label="Status: Delivered"
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--color-success)]"
        >
          <CheckCircle2 aria-hidden="true" size={16} />
          Delivered
        </span>
      ) : (
        <a
          href={downloadHref}
          download={transfer.fileName}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
        >
          <Download aria-hidden="true" size={16} />
          Download
        </a>
      )}
    </li>
  );
}
