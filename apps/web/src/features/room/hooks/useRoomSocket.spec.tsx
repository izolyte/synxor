import { useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import { expect } from "vitest";
import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { useRoomSocket } from "~/features/room/hooks/useRoomSocket";
import { RoomEvent } from "~/features/room/constants/room-events";
import { TransferEvent, type TransferProgressPayload } from "~/features/room/constants/transfer";

type Handler = (payload?: unknown) => void;

// The reconnection lifecycle rides the Manager (socket.io), not the Socket, so the
// fake mirrors that split: `io` is a bare emitter the hook subscribes to for
// "reconnect_failed".
class FakeManager {
  private readonly handlers = new Map<string, Handler>();
  on(event: string, cb: Handler): this {
    this.handlers.set(event, cb);
    return this;
  }
  off(): this {
    this.handlers.clear();
    return this;
  }
  emit(event: string, payload?: unknown): void {
    this.handlers.get(event)?.(payload);
  }
}

// Records handlers so the Harness buttons can fire socket events inside userEvent's
// act() — driving the hook the way a real server would, without a socket.
class FakeSocket {
  private readonly handlers = new Map<string, Handler>();
  readonly io = new FakeManager();
  // Mirrors socket.io's connection flag; closeRoom refuses to emit without it.
  connected = true;
  // Outgoing emits the hook makes (e.g. sendText), so a test can assert them.
  readonly sent: Array<{ event: string; payload?: unknown }> = [];
  // The ack an emit-with-callback (closeRoom) resolves to; tests override it.
  nextAck: unknown = { ok: true };
  on(event: string, cb: Handler): this {
    this.handlers.set(event, cb);
    return this;
  }
  off(): this {
    this.handlers.clear();
    return this;
  }
  disconnect(): this {
    return this;
  }
  emit(event: string, payload?: unknown): void {
    this.sent.push({ event, payload });
    // socket.io calls a trailing callback with the server ack; mirror that so
    // closeRoom resolves.
    if (typeof payload === "function") {
      (payload as (ack: unknown) => void)(this.nextAck);
      return;
    }
    this.handlers.get(event)?.(payload);
  }
}

function progress(transferId: string, receivedChunks: number): TransferProgressPayload {
  return {
    transferId,
    fileName: `${transferId}.txt`,
    fileSizeBytes: 1024,
    receivedChunks,
    totalChunks: 2,
    complete: receivedChunks === 2,
  };
}

function Harness({
  token: initialToken,
  socket,
}: {
  token: string | undefined;
  socket: FakeSocket;
}) {
  // Local so a button can swap the token mid-test (a rejoin gets a new one).
  const [token, setToken] = useState(initialToken);
  const [closeResult, setCloseResult] = useState("pending");
  const factory = useMemo(() => () => socket as unknown as Socket, [socket]);
  const { status, receiverCount, transfers, texts, delivered, closed, sendText, closeRoom } =
    useRoomSocket(token, factory);
  return (
    <>
      <output data-testid="status">{status}</output>
      <output data-testid="closed">{String(closed)}</output>
      <output data-testid="close-result">{closeResult}</output>
      <output data-testid="count">{receiverCount}</output>
      <output data-testid="transfers">
        {/* "none" over an empty string: jest-dom rejects toHaveTextContent(""). */}
        {transfers.length === 0
          ? "none"
          : transfers.map((t) => `${t.transferId}:${t.receivedChunks}/${t.totalChunks}`).join(" ")}
      </output>
      <output data-testid="delivered">
        {delivered.size === 0 ? "none" : [...delivered].join(" ")}
      </output>
      <output data-testid="texts">
        {texts.length === 0
          ? "none"
          : texts.map((t) => `${t.payloadType}:${t.content}`).join(" ")}
      </output>
      <button
        onClick={() =>
          socket.emit(TransferEvent.Text, {
            transferId: "x1",
            payloadType: "LINK",
            content: "https://example.com",
          })
        }
      >
        recv-text
      </button>
      <button onClick={() => sendText("hello world")}>send-text</button>
      <button onClick={() => socket.emit("connect")}>connect</button>
      <button onClick={() => socket.emit("disconnect")}>drop</button>
      <button onClick={() => socket.emit("connect_error")}>fail</button>
      <button onClick={() => socket.io.emit("reconnect_failed")}>give-up</button>
      <button onClick={() => socket.emit(RoomEvent.Joined, { receiverCount: 1 })}>join</button>
      <button onClick={() => socket.emit(RoomEvent.Joined, { receiverCount: "x" })}>garbage</button>
      <button onClick={() => socket.emit(RoomEvent.Left, { receiverCount: 0 })}>leave</button>
      <button onClick={() => socket.emit(TransferEvent.Progress, progress("a", 1))}>send-a1</button>
      <button onClick={() => socket.emit(TransferEvent.Progress, progress("a", 2))}>send-a2</button>
      <button onClick={() => socket.emit(TransferEvent.Progress, progress("b", 1))}>send-b1</button>
      <button onClick={() => socket.emit(TransferEvent.Progress, { fileName: "no-id.txt" })}>
        send-malformed
      </button>
      <button onClick={() => socket.emit(TransferEvent.Delivered, { transferId: "a" })}>
        deliver-a
      </button>
      <button onClick={() => socket.emit(TransferEvent.Delivered, { note: "no-id" })}>
        deliver-malformed
      </button>
      <button onClick={() => setToken("tok-2")}>retoken</button>
      <button onClick={() => socket.emit(RoomEvent.Closed)}>recv-closed</button>
      <button onClick={async () => setCloseResult(JSON.stringify(await closeRoom()))}>close</button>
    </>
  );
}

suite("useRoomSocket", () => {
  test("stays idle with no Room Token (unresolved session / SSR)", async () => {
    const screen = renderComponent(<Harness token={undefined} socket={new FakeSocket()} />);
    await screen.find({ testId: "status" }).shouldHaveText("idle");
    await screen.find({ testId: "count" }).shouldHaveText("0");
  });

  test("connects with a token and reports connected", async () => {
    const screen = renderComponent(<Harness token="tok" socket={new FakeSocket()} />);
    await screen.find({ testId: "status" }).shouldHaveText("connecting");

    await screen.find({ role: "button", name: "connect" }).click();
    await screen.find({ testId: "status" }).shouldHaveText("connected");
  });

  test("tracks the receiver count from room:joined and room:left", async () => {
    const screen = renderComponent(<Harness token="tok" socket={new FakeSocket()} />);

    await screen.find({ role: "button", name: "join" }).click();
    await screen.find({ testId: "count" }).shouldHaveText("1");

    await screen.find({ role: "button", name: "leave" }).click();
    await screen.find({ testId: "count" }).shouldHaveText("0");
  });

  test("reports disconnected but holds the count for reconnect", async () => {
    const screen = renderComponent(<Harness token="tok" socket={new FakeSocket()} />);

    await screen.find({ role: "button", name: "join" }).click();
    await screen.find({ role: "button", name: "drop" }).click();

    await screen.find({ testId: "status" }).shouldHaveText("disconnected");
    await screen.find({ testId: "count" }).shouldHaveText("1");
  });

  test("treats a failed handshake as disconnected, not a stuck 'connecting'", async () => {
    const screen = renderComponent(<Harness token="tok" socket={new FakeSocket()} />);

    await screen.find({ role: "button", name: "fail" }).click();
    await screen.find({ testId: "status" }).shouldHaveText("disconnected");
  });

  test("reports lost once the Manager exhausts its reconnect attempts", async () => {
    const screen = renderComponent(<Harness token="tok" socket={new FakeSocket()} />);

    await screen.find({ role: "button", name: "give-up" }).click();
    await screen.find({ testId: "status" }).shouldHaveText("lost");
  });

  test("recovers from lost when the socket connects again (manual refresh, network back)", async () => {
    const screen = renderComponent(<Harness token="tok" socket={new FakeSocket()} />);

    await screen.find({ role: "button", name: "give-up" }).click();
    await screen.find({ testId: "status" }).shouldHaveText("lost");

    await screen.find({ role: "button", name: "connect" }).click();
    await screen.find({ testId: "status" }).shouldHaveText("connected");
  });

  test("coerces a malformed count to 0 instead of rendering NaN", async () => {
    const screen = renderComponent(<Harness token="tok" socket={new FakeSocket()} />);

    await screen.find({ role: "button", name: "garbage" }).click();
    await screen.find({ testId: "count" }).shouldHaveText("0");
  });

  test("appends a transfer on its first progress event, in arrival order", async () => {
    const screen = renderComponent(<Harness token="tok" socket={new FakeSocket()} />);

    await screen.find({ role: "button", name: "send-a1" }).click();
    await screen.find({ role: "button", name: "send-b1" }).click();

    await screen.find({ testId: "transfers" }).shouldHaveText("a:1/2 b:1/2");
  });

  test("upserts progress for a known transfer in place, keeping its position", async () => {
    const screen = renderComponent(<Harness token="tok" socket={new FakeSocket()} />);

    await screen.find({ role: "button", name: "send-a1" }).click();
    await screen.find({ role: "button", name: "send-b1" }).click();
    await screen.find({ role: "button", name: "send-a2" }).click();

    await screen.find({ testId: "transfers" }).shouldHaveText("a:2/2 b:1/2");
  });

  test("drops a malformed progress payload (no transferId) whole", async () => {
    const screen = renderComponent(<Harness token="tok" socket={new FakeSocket()} />);

    await screen.find({ role: "button", name: "send-a1" }).click();
    await screen.find({ role: "button", name: "send-malformed" }).click();

    await screen.find({ testId: "transfers" }).shouldHaveText("a:1/2");
  });

  test("resets the transfer feed when the token changes (new session, new Room)", async () => {
    const screen = renderComponent(<Harness token="tok" socket={new FakeSocket()} />);

    await screen.find({ role: "button", name: "send-a1" }).click();
    await screen.find({ testId: "transfers" }).shouldHaveText("a:1/2");

    await screen.find({ role: "button", name: "retoken" }).click();

    await screen.find({ testId: "transfers" }).shouldHaveText("none");
    await screen.find({ testId: "status" }).shouldHaveText("connecting");
  });

  test("appends an incoming Text/Link payload", async () => {
    const screen = renderComponent(<Harness token="tok" socket={new FakeSocket()} />);

    await screen.find({ role: "button", name: "recv-text" }).click();

    await screen.find({ testId: "texts" }).shouldHaveText("LINK:https://example.com");
  });

  test("records a transfer:delivered once, ignoring a replayed duplicate", async () => {
    const screen = renderComponent(<Harness token="tok" socket={new FakeSocket()} />);

    await screen.find({ role: "button", name: "deliver-a" }).click();
    await screen.find({ testId: "delivered" }).shouldHaveText("a");

    // A reconnect could replay the same event; the Set keeps it idempotent.
    await screen.find({ role: "button", name: "deliver-a" }).click();
    await screen.find({ testId: "delivered" }).shouldHaveText("a");
  });

  test("drops a malformed delivered payload (no transferId)", async () => {
    const screen = renderComponent(<Harness token="tok" socket={new FakeSocket()} />);

    await screen.find({ role: "button", name: "deliver-malformed" }).click();
    await screen.find({ testId: "delivered" }).shouldHaveText("none");
  });

  test("clears delivered ids when the token changes (new session, new Room)", async () => {
    const screen = renderComponent(<Harness token="tok" socket={new FakeSocket()} />);

    await screen.find({ role: "button", name: "deliver-a" }).click();
    await screen.find({ testId: "delivered" }).shouldHaveText("a");

    await screen.find({ role: "button", name: "retoken" }).click();
    await screen.find({ testId: "delivered" }).shouldHaveText("none");
  });

  test("sendText emits the payload over the socket", async () => {
    const socket = new FakeSocket();
    const screen = renderComponent(<Harness token="tok" socket={socket} />);

    await screen.find({ role: "button", name: "send-text" }).click();

    expect(socket.sent).toContainEqual({
      event: "transfer:text:send",
      payload: { text: "hello world" },
    });
  });

  test("room:closed latches the socket closed", async () => {
    const screen = renderComponent(<Harness token="tok" socket={new FakeSocket()} />);
    await screen.find({ testId: "closed" }).shouldHaveText("false");

    await screen.find({ role: "button", name: "recv-closed" }).click();
    await screen.find({ testId: "closed" }).shouldHaveText("true");
  });

  test("closeRoom emits room:close and resolves with the server ack", async () => {
    const socket = new FakeSocket();
    const screen = renderComponent(<Harness token="tok" socket={socket} />);

    await screen.find({ role: "button", name: "close" }).click();

    expect(socket.sent.some((s) => s.event === "room:close")).toBe(true);
    await screen.find({ testId: "close-result" }).shouldHaveText('{"ok":true}');
  });

  test("closeRoom resolves an error when there is no live socket", async () => {
    // No token → the hook never opens a socket, so closeRoom can't reach a server.
    const screen = renderComponent(<Harness token={undefined} socket={new FakeSocket()} />);

    await screen.find({ role: "button", name: "close" }).click();
    await screen.find({ testId: "close-result" }).shouldHaveText('{"error":"No connection"}');
  });

  test("closeRoom fails fast instead of hanging on a disconnected socket", async () => {
    // A socket exists but isn't connected (dropped / lost): the emit would buffer
    // and its ack never fire, so closeRoom must resolve an error, not hang.
    const socket = new FakeSocket();
    socket.connected = false;
    const screen = renderComponent(<Harness token="tok" socket={socket} />);

    await screen.find({ role: "button", name: "close" }).click();
    await screen.find({ testId: "close-result" }).shouldHaveText('{"error":"No connection"}');
    expect(socket.sent.some((s) => s.event === "room:close")).toBe(false);
  });
});
