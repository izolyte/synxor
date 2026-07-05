import { IncomingTransferRow } from "~/features/room/components/IncomingTransferRow";
import { IncomingTextRow } from "~/features/room/components/IncomingTextRow";
import type {
  TransferProgressPayload,
  TransferTextPayload,
} from "~/features/room/constants/transfer";
import { downloadUrl } from "~/features/room/services/chunk-upload.service";

/**
 * Receiver's incoming feed: Text Snippets / Links first, then files. Teaches the
 * surface while it's empty. File download links need both the session token and
 * the API origin — until the caller has them (session resolving, socket not live)
 * file rows stay hidden rather than rendering broken links; text rows need
 * neither, so they show as soon as they arrive.
 */
export function IncomingTransfers({
  transfers,
  texts,
  token,
  apiOrigin,
}: {
  transfers: TransferProgressPayload[];
  texts: TransferTextPayload[];
  token: string | undefined;
  apiOrigin: string | undefined;
}) {
  const canDownload = Boolean(token && apiOrigin);
  const showFiles = canDownload && transfers.length > 0;

  if (texts.length === 0 && !showFiles) {
    return (
      <p className="text-muted-foreground text-sm">
        Files, text, and links the Sender shares will appear here.
      </p>
    );
  }

  return (
    <ul role="list" className="flex flex-col gap-1.5">
      {texts.map((payload) => (
        <IncomingTextRow key={payload.transferId} payload={payload} />
      ))}
      {showFiles &&
        transfers.map((transfer) => (
          <IncomingTransferRow
            key={transfer.transferId}
            transfer={transfer}
            downloadHref={downloadUrl(apiOrigin as string, transfer.transferId, token as string)}
          />
        ))}
    </ul>
  );
}
