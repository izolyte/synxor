import { useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import { expect } from "vitest";
import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { useRoomSocket } from "~/features/room/hooks/useRoomSocket";
import { RoomEvent } from "~/features/room/constants/room-events";
import { TransferEvent, type TransferProgressPayload } from "~/features/room/constants/transfer";

type Handler = (payload?: unknown) => void;

// Records handlers so the Harness buttons can fire socket events inside userEvent's
// act() — driving the hook the way a real server would, without a socket.
class FakeSocket {
  private readonly handlers = new Map<string, Handler>();
  // Outgoing emits the hook makes (e.g. sendText), so a test can assert them.
  readonly sent: Array<{ event: string; payload?: unknown }> = [];
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
  const factory = useMemo(() => () => socket as unknown as Socket, [socket]);
  const { status, receiverCount, transfers, texts, sendText } = useRoomSocket(token, factory);
  return (
    <>
      <output data-testid="status">{status}</output>
      <output data-testid="count">{receiverCount}</output>
      <output data-testid="transfers">
        {/* "none" over an empty string: jest-dom rejects toHaveTextContent(""). */}
        {transfers.length === 0
          ? "none"
          : transfers.map((t) => `${t.transferId}:${t.receivedChunks}/${t.totalChunks}`).join(" ")}
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
      <button onClick={() => socket.emit(RoomEvent.Joined, { receiverCount: 1 })}>join</button>
      <button onClick={() => socket.emit(RoomEvent.Joined, { receiverCount: "x" })}>garbage</button>
      <button onClick={() => socket.emit(RoomEvent.Left, { receiverCount: 0 })}>leave</button>
      <button onClick={() => socket.emit(TransferEvent.Progress, progress("a", 1))}>send-a1</button>
      <button onClick={() => socket.emit(TransferEvent.Progress, progress("a", 2))}>send-a2</button>
      <button onClick={() => socket.emit(TransferEvent.Progress, progress("b", 1))}>send-b1</button>
      <button onClick={() => socket.emit(TransferEvent.Progress, { fileName: "no-id.txt" })}>
        send-malformed
      </button>
      <button onClick={() => setToken("tok-2")}>retoken</button>
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

  test("sendText emits the payload over the socket", async () => {
    const socket = new FakeSocket();
    const screen = renderComponent(<Harness token="tok" socket={socket} />);

    await screen.find({ role: "button", name: "send-text" }).click();

    expect(socket.sent).toContainEqual({
      event: "transfer:text:send",
      payload: { text: "hello world" },
    });
  });
});
