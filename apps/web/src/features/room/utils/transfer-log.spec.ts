import { expect } from "vitest";
import { suite, test } from "~test/kit";
import { mergeTransferLog, type TransferHistory } from "~/features/room/utils/transfer-log";
import type { RoomText } from "~/features/room/hooks/useRoomSocket";
import type { TransferProgressPayload } from "~/features/room/constants/transfer";

function historyFile(over: Partial<TransferHistory[number]> = {}): TransferHistory[number] {
  return {
    id: "h1",
    payloadType: "FILE",
    fileName: "report.pdf",
    fileSizeBytes: 1024,
    content: null,
    author: null,
    delivered: true,
    createdAt: "2026-01-01T10:00:00.000Z",
    ...over,
  };
}

function historyText(over: Partial<TransferHistory[number]> = {}): TransferHistory[number] {
  return {
    id: "ht1",
    payloadType: "TEXT_SNIPPET",
    fileName: null,
    fileSizeBytes: null,
    content: "saved note",
    author: { role: "RECEIVER" },
    delivered: true,
    createdAt: "2026-01-01T10:05:00.000Z",
    ...over,
  };
}

function progress(over: Partial<TransferProgressPayload> = {}): TransferProgressPayload {
  return {
    transferId: "p1",
    fileName: "clip.mp4",
    fileSizeBytes: 2048,
    receivedChunks: 1,
    totalChunks: 4,
    complete: false,
    ...over,
  };
}

function text(over: Partial<RoomText> = {}): RoomText {
  return {
    transferId: "x1",
    payloadType: "TEXT_SNIPPET",
    content: "hello world",
    author: { role: "SENDER" },
    mine: false,
    ...over,
  };
}

const noLive = {
  transfers: [],
  texts: [],
  delivered: new Set<string>(),
  ownIds: new Set<string>(),
  isSender: false,
  liveTimestamps: new Map<string, number>(),
};

suite("mergeTransferLog", () => {
  test("maps a delivered file from history to a file row", () => {
    const [row] = mergeTransferLog({ history: [historyFile()], ...noLive });
    expect(row).toMatchObject({
      id: "h1",
      kind: "file",
      name: "report.pdf",
      sizeBytes: 1024,
      status: "delivered",
      receivedAt: Date.parse("2026-01-01T10:00:00.000Z"),
    });
  });

  test("an undelivered history file reads as in progress", () => {
    const [row] = mergeTransferLog({ history: [historyFile({ delivered: false })], ...noLive });
    expect(row.status).toBe("in_progress");
  });

  test("builds a download href for a file when one is available", () => {
    const [row] = mergeTransferLog({
      history: [historyFile()],
      ...noLive,
      downloadHref: (id) => `http://api.test/dl/${id}`,
    });
    expect(row.href).toBe("http://api.test/dl/h1");
  });

  test("appends a live file row not present in history, marking delivery from the set", () => {
    const rows = mergeTransferLog({
      ...noLive,
      history: [],
      transfers: [progress({ transferId: "p1" })],
      delivered: new Set(["p1"]),
      liveTimestamps: new Map([["p1", 5]]),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "p1", kind: "file", status: "delivered", receivedAt: 5 });
  });

  test("a live progress event refines a persisted row's status but keeps its timestamp", () => {
    const rows = mergeTransferLog({
      ...noLive,
      history: [historyFile({ id: "same", delivered: false })],
      transfers: [progress({ transferId: "same" })],
      delivered: new Set(["same"]),
      liveTimestamps: new Map([["same", 999]]),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("delivered");
    expect(rows[0].receivedAt).toBe(Date.parse("2026-01-01T10:00:00.000Z"));
  });

  test("a delivered history row isn't downgraded by a lagging live progress event", () => {
    const rows = mergeTransferLog({
      ...noLive,
      history: [historyFile({ id: "same", delivered: true })],
      transfers: [progress({ transferId: "same" })],
      liveTimestamps: new Map([["same", 999]]),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("delivered");
  });

  test("hydrates a persisted snippet from history with its content", () => {
    const [row] = mergeTransferLog({ history: [historyText()], ...noLive });
    expect(row).toMatchObject({
      id: "ht1",
      kind: "snippet",
      name: "saved note",
      content: "saved note",
      status: "delivered",
    });
  });

  test("hydrates a persisted link from history with an href", () => {
    const [row] = mergeTransferLog({
      history: [historyText({ id: "hl1", payloadType: "LINK", content: "https://example.com/x" })],
      ...noLive,
    });
    expect(row).toMatchObject({
      id: "hl1",
      kind: "link",
      name: "https://example.com/x",
      href: "https://example.com/x",
      status: "delivered",
    });
  });

  test("carries a history row's author through for attribution", () => {
    const [row] = mergeTransferLog({
      history: [historyText({ author: { role: "RECEIVER" } })],
      ...noLive,
    });
    expect(row.author).toEqual({ role: "RECEIVER" });
    expect(row.mine).toBe(false);
  });

  test("marks a history row mine when this client recorded sending it", () => {
    const [row] = mergeTransferLog({
      history: [historyText({ id: "own" })],
      ...noLive,
      ownIds: new Set(["own"]),
    });
    expect(row.mine).toBe(true);
  });

  test("a file is mine only when this client is the Sender", () => {
    const asReceiver = mergeTransferLog({ history: [historyFile()], ...noLive, isSender: false });
    expect(asReceiver[0].mine).toBe(false);
    expect(asReceiver[0].author).toEqual({ role: "SENDER" });

    const asSender = mergeTransferLog({ history: [historyFile()], ...noLive, isSender: true });
    expect(asSender[0].mine).toBe(true);
    expect(asSender[0].author).toBeNull();
  });

  test("a live text event and its persisted history row collapse to one", () => {
    const rows = mergeTransferLog({
      ...noLive,
      history: [historyText({ id: "dup", content: "note" })],
      texts: [text({ transferId: "dup", content: "note" })],
      liveTimestamps: new Map([["dup", Date.parse("2026-01-01T11:00:00.000Z")]]),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].receivedAt).toBe(Date.parse("2026-01-01T10:05:00.000Z"));
  });

  test("skips a persisted text/link row that has no content", () => {
    const rows = mergeTransferLog({
      ...noLive,
      history: [historyText({ id: "empty", content: null })],
    });
    expect(rows).toHaveLength(0);
  });

  test("maps a live text snippet to a copyable snippet row, tagged mine", () => {
    const rows = mergeTransferLog({
      ...noLive,
      history: [],
      texts: [text({ transferId: "x1", content: "multi\nline\ttext", mine: true, author: null })],
      liveTimestamps: new Map([["x1", 1]]),
    });
    expect(rows[0]).toMatchObject({
      id: "x1",
      kind: "snippet",
      name: "multi line text",
      content: "multi\nline\ttext",
      status: "delivered",
      mine: true,
    });
  });

  test("maps an incoming link payload to a link row with its author", () => {
    const rows = mergeTransferLog({
      ...noLive,
      history: [],
      texts: [
        text({
          transferId: "l1",
          payloadType: "LINK",
          content: "https://example.com",
          author: { role: "RECEIVER" },
        }),
      ],
      liveTimestamps: new Map([["l1", 1]]),
    });
    expect(rows[0]).toMatchObject({
      kind: "link",
      name: "https://example.com",
      href: "https://example.com",
      mine: false,
      author: { role: "RECEIVER" },
    });
  });

  test("orders rows oldest first across history and live sources", () => {
    const rows = mergeTransferLog({
      ...noLive,
      history: [historyFile({ id: "old", createdAt: "2026-01-01T09:00:00.000Z" })],
      transfers: [progress({ transferId: "new" })],
      liveTimestamps: new Map([["new", Date.parse("2026-01-01T11:00:00.000Z")]]),
    });
    expect(rows.map((r) => r.id)).toEqual(["old", "new"]);
  });
});
