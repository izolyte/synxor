import type { RoomText } from "~/features/room/hooks/useRoomSocket";
import type {
  TransferAuthor,
  TransferProgressPayload,
} from "~/features/room/constants/transfer";
import type { RouterOutputs } from "~/shared/services/trpc";

export type TransferHistory = RouterOutputs["room"]["transfers"];

export type TransferKind = "file" | "snippet" | "link";
// The stream only ever shows two states: a file mid-download, or anything landed.
// Text and links arrive whole, so they're delivered on sight.
export type TransferStatus = "in_progress" | "delivered";

// One message in the Room stream: the payload plus who it's from relative to this
// client (`mine` right-aligns it as outgoing; `author` labels an incoming one)
// and `receivedAt`, which the chronological sort keys off.
export interface TransferLogRow {
  id: string;
  kind: TransferKind;
  /** Filename for a file, the URL for a link, a short preview for a snippet. */
  name: string;
  /** Full Text Snippet / Link body for the bubble; unset for files. */
  content?: string;
  status: TransferStatus;
  /** Files only — drives the size line. */
  sizeBytes?: number;
  /** Download URL (file) or destination URL (link). */
  href?: string;
  author: TransferAuthor | null;
  mine: boolean;
  receivedAt: number;
}

// Builds a download URL for a file row, or undefined when the caller has no live
// session (SSR, unresolved token) and can't form a working link.
export type DownloadHref = (transferId: string, fileName: string) => string | undefined;

// Collapse whitespace so a multi-line snippet reads as a single preview in the
// name/title (a link is a single token already).
function snippetPreview(content: string): string {
  return content.replace(/\s+/g, " ").trim();
}

// Files ride HTTP with no socket Participant, so they carry no author row — but
// only the Sender uploads, so a file is the Sender's, and it's "yours" iff you
// are the Sender.
function fileAuthor(isSender: boolean): TransferAuthor | null {
  return isSender ? null : { role: "SENDER" };
}

function textRow(
  id: string,
  payloadType: "TEXT_SNIPPET" | "LINK",
  content: string,
  author: TransferAuthor | null,
  mine: boolean,
  receivedAt: number,
): TransferLogRow {
  const isLink = payloadType === "LINK";
  return {
    id,
    kind: isLink ? "link" : "snippet",
    name: isLink ? content : snippetPreview(content),
    content,
    // Text and links land whole — nothing in flight to show.
    status: "delivered",
    href: isLink ? content : undefined,
    author,
    mine,
    receivedAt,
  };
}

function historyRow(
  item: TransferHistory[number],
  ownIds: ReadonlySet<string>,
  isSender: boolean,
  downloadHref?: DownloadHref,
): TransferLogRow | null {
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
      author: fileAuthor(isSender),
      mine: isSender,
      receivedAt,
    };
  }
  // A persisted Text Snippet / Link. A null content means no readable body, so
  // skip it rather than render a blank, dead row. `mine` is resolved locally: the
  // socket only broadcasts to other Participants, so this client's own history
  // rows are the ones it recorded as sent (survives reload via sessionStorage).
  if (item.content == null) return null;
  return textRow(item.id, item.payloadType, item.content, item.author, ownIds.has(item.id), receivedAt);
}

function liveFileRow(
  payload: TransferProgressPayload,
  delivered: ReadonlySet<string>,
  isSender: boolean,
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
    author: fileAuthor(isSender),
    mine: isSender,
    receivedAt,
  };
}

function liveTextRow(payload: RoomText, receivedAt: number): TransferLogRow {
  return textRow(
    payload.transferId,
    payload.payloadType,
    payload.content,
    payload.author,
    payload.mine,
    receivedAt,
  );
}

export interface MergeTransferLogInput {
  history: TransferHistory;
  transfers: TransferProgressPayload[];
  texts: RoomText[];
  delivered: ReadonlySet<string>;
  /** transferIds this client sent, to attribute its own hydrated history rows. */
  ownIds: ReadonlySet<string>;
  /** Whether this client is the Sender — the only Participant that uploads files. */
  isSender: boolean;
  /** First-seen wall-clock time per live transferId; the socket carries none. */
  liveTimestamps: ReadonlyMap<string, number>;
  downloadHref?: DownloadHref;
}

/**
 * Merges the tRPC history snapshot with the live socket feed into one ordered
 * stream. Rows are keyed by transferId: a live event refines a persisted row's
 * status in place (a file the server later records as delivered), while the
 * persisted `createdAt` stays authoritative for ordering. Live-only rows (an
 * in-flight upload, a just-sent message the history hasn't caught up to) use
 * their first-seen time. Output is sorted oldest-first, the order Transfers
 * arrive in the Room.
 */
export function mergeTransferLog({
  history,
  transfers,
  texts,
  delivered,
  ownIds,
  isSender,
  liveTimestamps,
  downloadHref,
}: MergeTransferLogInput): TransferLogRow[] {
  const rows = new Map<string, TransferLogRow>();

  for (const item of history) {
    const row = historyRow(item, ownIds, isSender, downloadHref);
    if (row) rows.set(item.id, row);
  }

  const overlay = (row: TransferLogRow) => {
    const existing = rows.get(row.id);
    if (!existing) {
      rows.set(row.id, row);
      return;
    }
    // A persisted row owns its timestamp; the live event refreshes the payload
    // on top of it. Delivery and authorship are monotonic — once delivered or
    // marked mine, a trailing stale payload can't regress them.
    const status = existing.status === "delivered" ? "delivered" : row.status;
    rows.set(row.id, {
      ...row,
      receivedAt: existing.receivedAt,
      status,
      mine: existing.mine || row.mine,
    });
  };

  for (const payload of transfers) {
    const at = liveTimestamps.get(payload.transferId) ?? Date.now();
    overlay(liveFileRow(payload, delivered, isSender, at, downloadHref));
  }
  for (const payload of texts) {
    const at = liveTimestamps.get(payload.transferId) ?? Date.now();
    overlay(liveTextRow(payload, at));
  }

  return [...rows.values()].sort((a, b) => a.receivedAt - b.receivedAt);
}
