import { IncomingTransferRow } from "~/features/room/components/IncomingTransferRow";
import type { TransferProgressPayload } from "~/features/room/constants/transfer";
import { downloadUrl } from "~/features/room/services/chunk-upload.service";

/**
 * Receiver's incoming feed; teaches the surface while it's empty. Download links
 * need both the session token and the API origin — until the caller has them
 * (session still resolving, socket not live) the feed stays in its empty state
 * rather than rendering rows with broken links.
 */
export function IncomingTransfers({
  transfers,
  token,
  apiOrigin,
}: {
  transfers: TransferProgressPayload[];
  token: string | undefined;
  apiOrigin: string | undefined;
}) {
  if (transfers.length === 0 || !token || !apiOrigin) {
    return (
      <p className="text-muted-foreground text-sm">
        Files the Sender shares will appear here, ready to download.
      </p>
    );
  }
  return (
    <ul role="list" className="flex flex-col gap-1.5">
      {transfers.map((transfer) => (
        <IncomingTransferRow
          key={transfer.transferId}
          transfer={transfer}
          downloadHref={downloadUrl(apiOrigin, transfer.transferId, token)}
        />
      ))}
    </ul>
  );
}
