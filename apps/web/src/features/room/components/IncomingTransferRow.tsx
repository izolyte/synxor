import { Download, File as FileIcon } from "lucide-react";
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
 */
export function IncomingTransferRow({
  transfer,
  downloadHref,
}: {
  transfer: TransferProgressPayload;
  downloadHref: string;
}) {
  const percent = Math.round((transfer.receivedChunks / transfer.totalChunks) * 100);

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
        {!transfer.complete && (
          <TransferProgressBar
            percent={percent}
            label={`Receiving ${transfer.fileName}`}
            compact
          />
        )}
      </div>
      <a
        href={downloadHref}
        download={transfer.fileName}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
      >
        <Download aria-hidden="true" size={16} />
        Download
      </a>
    </li>
  );
}
