import type { TransferRowData } from "~/features/room/components/TransferRow";
import type {
  TransferProgressPayload,
  TransferTextPayload,
} from "~/features/room/constants/transfer";
import type { RouterOutputs } from "~/shared/services/trpc";

export type TransferHistory = RouterOutputs["room"]["transfers"];

// A Log row is the presentational row data plus the wall-clock time it landed —
// the timestamp column and the chronological sort both key off it.
export interface TransferLogRow extends TransferRowData {
  receivedAt: number;
}

// Builds a download URL for a file row, or undefined when the caller has no live
// session (SSR, unresolved token) and can't form a working link.
export type DownloadHref = (transferId: string, fileName: string) => string | undefined;

// Collapse whitespace so a multi-line snippet reads as a single truncated
// preview in the name column (a link is a single token already).
function snippetPreview(content: string): string {
  return content.replace(/\s+/g, " ").trim();
}

function historyRow(item: TransferHistory[number], downloadHref?: DownloadHref): TransferLogRow {
  const receivedAt = Date.parse(item.createdAt);
  if (item.payloadType === "FILE") {
    const name = item.fileName ?? "File";
    return {
      id: item.id,
      kind: "file",
      name,
      status: item.delivered ? "delivered" : "in_progress",
      sizeBytes: item.fileSizeBytes ?? undefined,
      href: downloadHref?.(item.id, name),
      receivedAt,
    };
  }
  // A persisted Text Snippet / Link. `content` carries the body so a reload or
  // late-join renders the same copy/open row the live socket feed produces —
  // mirror liveTextRow so both paths yield identical rows.
  const isLink = item.payloadType === "LINK";
  const content = item.content ?? "";
  return {
    id: item.id,
    kind: isLink ? "link" : "snippet",
    name: isLink ? content : snippetPreview(content),
    // Text and links land whole; a persisted one is delivered by definition.
    status: "delivered",
    href: isLink ? content : undefined,
    value: content,
    receivedAt,
  };
}

function liveFileRow(
  payload: TransferProgressPayload,
  delivered: ReadonlySet<string>,
  receivedAt: number,
  downloadHref?: DownloadHref,
): TransferLogRow {
  return {
    id: payload.transferId,
    kind: "file",
    name: payload.fileName,
    status: delivered.has(payload.transferId) ? "delivered" : "in_progress",
    sizeBytes: payload.fileSizeBytes,
    href: downloadHref?.(payload.transferId, payload.fileName),
    receivedAt,
  };
}

function liveTextRow(payload: TransferTextPayload, receivedAt: number): TransferLogRow {
  const isLink = payload.payloadType === "LINK";
  return {
    id: payload.transferId,
    kind: isLink ? "link" : "snippet",
    name: isLink ? payload.content : snippetPreview(payload.content),
    // Text and links arrive whole over the socket — there's no in-flight state to
    // show, so a Log entry for one is delivered on arrival.
    status: "delivered",
    href: isLink ? payload.content : undefined,
    value: payload.content,
    receivedAt,
  };
}

export interface MergeTransferLogInput {
  history: TransferHistory;
  transfers: TransferProgressPayload[];
  texts: TransferTextPayload[];
  delivered: ReadonlySet<string>;
  /** First-seen wall-clock time per live transferId; the socket carries none. */
  liveTimestamps: ReadonlyMap<string, number>;
  downloadHref?: DownloadHref;
}

/**
 * Merges the tRPC history snapshot with the live socket feed into one ordered
 * Log. Rows are keyed by transferId: a live event refines a persisted row's
 * status in place (a file the server later records as delivered), while the
 * persisted `createdAt` stays authoritative for ordering. Live-only rows (an
 * in-flight upload, a text/link the server never persists) use their first-seen
 * time. Output is sorted oldest-first, the order Transfers arrive in the Room.
 */
export function mergeTransferLog({
  history,
  transfers,
  texts,
  delivered,
  liveTimestamps,
  downloadHref,
}: MergeTransferLogInput): TransferLogRow[] {
  const rows = new Map<string, TransferLogRow>();

  for (const item of history) {
    rows.set(item.id, historyRow(item, downloadHref));
  }

  const overlay = (row: TransferLogRow) => {
    const existing = rows.get(row.id);
    if (!existing) {
      rows.set(row.id, row);
      return;
    }
    // A persisted row owns its timestamp; the live event only refreshes status,
    // href, and payload fields on top of it. But delivery is monotonic: once a
    // row is delivered it never regresses to in_progress just because a stale
    // live payload trails the delivered set.
    const status = existing.status === "delivered" ? "delivered" : row.status;
    rows.set(row.id, { ...row, receivedAt: existing.receivedAt, status });
  };

  for (const payload of transfers) {
    const at = liveTimestamps.get(payload.transferId) ?? Date.now();
    overlay(liveFileRow(payload, delivered, at, downloadHref));
  }
  for (const payload of texts) {
    const at = liveTimestamps.get(payload.transferId) ?? Date.now();
    overlay(liveTextRow(payload, at));
  }

  return [...rows.values()].sort((a, b) => a.receivedAt - b.receivedAt);
}
