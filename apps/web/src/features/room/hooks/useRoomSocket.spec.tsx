import { useMemo } from "react";
import type { Socket } from "socket.io-client";
import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { useRoomSocket } from "~/features/room/hooks/useRoomSocket";
import { RoomEvent } from "~/features/room/constants/room-events";

type Handler = (payload?: unknown) => void;

// Records handlers so the Harness buttons can fire socket events inside userEvent's
// act() — driving the hook the way a real server would, without a socket.
class FakeSocket {
  private readonly handlers = new Map<string, Handler>();
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
    this.handlers.get(event)?.(payload);
  }
}

function Harness({ token, socket }: { token: string | undefined; socket: FakeSocket }) {
  const factory = useMemo(() => () => socket as unknown as Socket, [socket]);
  const { status, receiverCount } = useRoomSocket(token, factory);
  return (
    <>
      <output data-testid="status">{status}</output>
      <output data-testid="count">{receiverCount}</output>
      <button onClick={() => socket.emit("connect")}>connect</button>
      <button onClick={() => socket.emit("disconnect")}>drop</button>
      <button onClick={() => socket.emit("connect_error")}>fail</button>
      <button onClick={() => socket.emit(RoomEvent.Joined, { receiverCount: 1 })}>join</button>
      <button onClick={() => socket.emit(RoomEvent.Joined, { receiverCount: "x" })}>garbage</button>
      <button onClick={() => socket.emit(RoomEvent.Left, { receiverCount: 0 })}>leave</button>
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
});
