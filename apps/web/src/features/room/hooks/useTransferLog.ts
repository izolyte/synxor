import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { downloadUrl } from "~/features/room/services/chunk-upload.service";
import {
  mergeTransferLog,
  type DownloadHref,
  type TransferHistory,
  type TransferLogRow,
} from "~/features/room/utils/transfer-log";
import type {
  TransferProgressPayload,
  TransferTextPayload,
} from "~/features/room/constants/transfer";

// Bound to the Room route so the query can read the tRPC proxy from context.
// Called from RoomPage (route-mounted, providers present), never from a bare
// component render — which is why the history is threaded into RoomShareView as
// a prop rather than fetched there.
const route = getRouteApi("/room/$roomCode");

/**
 * The Transfer Log's persistent history: the tRPC snapshot of every Transfer
 * recorded for the Room. A failed fetch reads as empty history, so the Log falls
 * back to the live socket feed rather than erroring.
 */
export function useRoomTransferHistory(roomCode: string): TransferHistory {
  const { trpc } = route.useRouteContext();
  const { data } = useQuery(trpc.room.transfers.queryOptions({ roomCode }));
  return data ?? [];
}

export interface UseTransferLogRowsArgs {
  history: TransferHistory;
  transfers: TransferProgressPayload[];
  texts: TransferTextPayload[];
  delivered: ReadonlySet<string>;
  /** Live session token; absent (SSR / expired) drops the download links. */
  token: string | undefined;
  apiOrigin: string | undefined;
}

/**
 * Merges the history snapshot with the live socket feed into the ordered Log
 * rows. Pure of any router/query context, so it composes anywhere the socket
 * state already lives (RoomShareView).
 */
export function useTransferLogRows({
  history,
  transfers,
  texts,
  delivered,
  token,
  apiOrigin,
}: UseTransferLogRowsArgs): TransferLogRow[] {
  // The socket carries no timestamps, so pin each live Transfer's first-seen time
  // once — a ref keeps it stable across the re-renders progress events cause, so
  // a row's timestamp doesn't creep forward as the file uploads.
  const seenRef = useRef<Map<string, number>>(new Map());
  const now = Date.now();
  for (const t of transfers)
    if (!seenRef.current.has(t.transferId)) seenRef.current.set(t.transferId, now);
  for (const t of texts)
    if (!seenRef.current.has(t.transferId)) seenRef.current.set(t.transferId, now);

  const downloadHref = useMemo<DownloadHref | undefined>(() => {
    if (!token || !apiOrigin) return undefined;
    return (transferId) => downloadUrl(apiOrigin, transferId, token);
  }, [token, apiOrigin]);

  return useMemo(
    () =>
      mergeTransferLog({
        history,
        transfers,
        texts,
        delivered,
        liveTimestamps: seenRef.current,
        downloadHref,
      }),
    [history, transfers, texts, delivered, downloadHref],
  );
}
