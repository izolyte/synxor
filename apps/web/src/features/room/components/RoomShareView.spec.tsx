import { useMemo, useState, type ReactNode } from "react";
import { act, fireEvent, screen as rtlScreen } from "@testing-library/react";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import type { Socket } from "socket.io-client";
import { expect } from "vitest";
import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { selectors } from "~test/app";
import { DAY, HOUR, MINUTE } from "~/shared/constants/time";
import { RoomShareView } from "~/features/room/components/RoomShareView";
import { TransferEvent, type TransferProgressPayload } from "~/features/room/constants/transfer";
import type { Uploader } from "~/features/room/hooks/useFileUploads";

type Handler = (payload?: unknown) => void;

// Minimal socket + Manager doubles, matching useRoomSocket.spec: the Harness
// buttons fire events inside act() to drive the view the way a real server would.
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

class FakeSocket {
  private readonly handlers = new Map<string, Handler>();
  readonly io = new FakeManager();
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

function progress(receivedChunks: number, complete: boolean): TransferProgressPayload {
  return {
    transferId: "a",
    fileName: "a.bin",
    fileSizeBytes: 4096,
    receivedChunks,
    totalChunks: 4,
    complete,
  };
}

// The sealed Room renders RoomNotice's <Link to="/">, which needs a Router in the
// tree. A minimal one-route router provides it — same render-then-load shape the
// Vitest Driver uses — without pulling in the whole app.
async function renderRouted(component: () => ReactNode) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  const screen = renderComponent(<RouterProvider router={router as never} />);
  await router.load();
  return screen;
}

suite("RoomShareView", () => {
  test("shows the code, both copy actions, the countdown and waiting state", async () => {
    // Day-scale expiry → "2d 3h"; the +30m buffer keeps the hours floor stable
    // against the few ms that elapse before the countdown reads the clock.
    const expiresAt = new Date(Date.now() + 2 * DAY + 3 * HOUR + 30 * MINUTE).toISOString();
    const screen = renderComponent(<RoomShareView roomCode="ABC123" expiresAt={expiresAt} />);

    await screen.find(selectors.room.heading("ready")).shouldBeVisible();
    await screen.find(selectors.room.code("ABC123")).shouldBeVisible();
    await screen.find(selectors.room.copyCode).shouldBeVisible();
    await screen.find(selectors.room.copyLink).shouldBeVisible();
    await screen.find({ text: "Expires in 2d 3h" }).shouldBeVisible();
    await screen.find(selectors.room.waiting).shouldBeVisible();
  });

  test("without an expiry (Receiver session), renders without a countdown", async () => {
    const screen = renderComponent(<RoomShareView roomCode="ABC123" expiresAt={undefined} />);

    await screen.find(selectors.room.heading("ready")).shouldBeVisible();
    await screen.find(selectors.room.code("ABC123")).shouldBeVisible();
    await screen.find(selectors.room.copyCode).shouldBeVisible();
    await screen.find(selectors.room.waiting).shouldBeVisible();
  });

  test("a Sender gets the Drop Zone", async () => {
    const screen = renderComponent(
      <RoomShareView roomCode="ABC123" expiresAt={undefined} role="sender" />,
    );

    await screen.find({ testId: "drop-zone" }).shouldBeVisible();
  });

  test("a Receiver gets the incoming feed instead of the Drop Zone", async () => {
    const screen = renderComponent(
      <RoomShareView roomCode="ABC123" expiresAt={undefined} role="receiver" />,
    );

    await screen
      .find({ text: "Files, text, and links the Sender shares will appear here." })
      .shouldBeVisible();
    await screen.find({ testId: "drop-zone" }).shouldNotExist();
  });

  test("holds an expired Room open until the in-flight Transfer lands, then seals", async () => {
    const socket = new FakeSocket();

    function Expiring() {
      const [expiresAt, setExpiresAt] = useState(new Date(Date.now() + HOUR).toISOString());
      const factory = useMemo(() => () => socket as unknown as Socket, []);
      return (
        <>
          <button onClick={() => setExpiresAt(new Date(Date.now() - 1000).toISOString())}>
            run-out
          </button>
          <button onClick={() => socket.emit("connect")}>connect</button>
          <button onClick={() => socket.emit(TransferEvent.Progress, progress(2, false))}>
            start
          </button>
          <button onClick={() => socket.emit(TransferEvent.Progress, progress(4, true))}>
            finish
          </button>
          <RoomShareView
            roomCode="ABC123"
            expiresAt={expiresAt}
            token="tok"
            socketFactory={factory}
          />
        </>
      );
    }

    const screen = await renderRouted(Expiring);
    await screen.find({ role: "button", name: "connect" }).click();
    await screen.find({ role: "button", name: "start" }).click();
    await screen.find({ testId: "drop-zone" }).shouldBeVisible();

    // TTL runs out mid-Transfer: the Room holds instead of collapsing, and the
    // countdown reads the sealing state rather than a zero.
    await screen.find({ role: "button", name: "run-out" }).click();
    await screen.find({ text: "Expiring…" }).shouldBeVisible();
    await screen.find({ testId: "drop-zone" }).shouldBeVisible();

    // The Transfer completes → the Room seals.
    await screen.find({ role: "button", name: "finish" }).click();
    await screen
      .find({ text: "This Room has expired. Create a new Room to send files." })
      .shouldBeVisible();
    await screen.find({ testId: "drop-zone" }).shouldNotExist();
  });

  test("holds an expired Room open while the Sender's own upload is still in flight", async () => {
    // The upload has started locally but the server hasn't broadcast its first
    // progress yet, so the socket `transfers` feed is still empty. The sealing
    // window must key off DropZone's local upload state, or the Room would seal
    // and unmount the upload it was meant to protect.
    const socket = new FakeSocket();
    // Parks each upload so it stays in the "uploading" phase until we release it.
    const pending: Array<() => void> = [];
    const uploader: Uploader = () =>
      new Promise((resolve) =>
        pending.push(() =>
          resolve({ transferId: "t1", receivedChunks: 1, totalChunks: 1, complete: true }),
        ),
      );

    function Uploading() {
      const [expiresAt, setExpiresAt] = useState(new Date(Date.now() + HOUR).toISOString());
      const factory = useMemo(() => () => socket as unknown as Socket, []);
      return (
        <>
          <button onClick={() => setExpiresAt(new Date(Date.now() - 1000).toISOString())}>
            run-out
          </button>
          <button onClick={() => socket.emit("connect")}>connect</button>
          <RoomShareView
            roomCode="ABC123"
            expiresAt={expiresAt}
            token="tok"
            role="sender"
            socketFactory={factory}
            uploader={uploader}
          />
        </>
      );
    }

    const screen = await renderRouted(Uploading);
    await screen.find({ role: "button", name: "connect" }).click();

    // Start a local upload; deliberately emit no socket progress event.
    fireEvent.change(rtlScreen.getByTestId("drop-zone-input"), {
      target: { files: [new File(["x"], "a.txt", { type: "text/plain" })] },
    });
    await screen.find({ text: "a.txt" }).shouldBeVisible();

    // TTL runs out with only the local upload in flight: the Room must hold, not
    // seal and unmount the Drop Zone.
    await screen.find({ role: "button", name: "run-out" }).click();
    await screen.find({ testId: "drop-zone" }).shouldBeVisible();

    // Upload finishes → nothing left in flight → the Room seals.
    await act(async () => pending[0]());
    await screen
      .find({ text: "This Room has expired. Create a new Room to send files." })
      .shouldBeVisible();
  });

  test("surfaces a lost connection with a refresh prompt when reconnect fails", async () => {
    const socket = new FakeSocket();

    function Live() {
      const factory = useMemo(() => () => socket as unknown as Socket, []);
      return (
        <>
          <button onClick={() => socket.io.emit("reconnect_failed")}>give-up</button>
          <RoomShareView
            roomCode="ABC123"
            expiresAt={undefined}
            token="tok"
            socketFactory={factory}
          />
        </>
      );
    }

    const screen = renderComponent(<Live />);
    await screen.find({ role: "button", name: "give-up" }).click();

    await screen.find({ text: "Lost connection. Refresh to continue." }).shouldBeVisible();
    expect(rtlScreen.getByRole("alert")).toBeVisible();
    // The stale presence line yields to the alert.
    await screen.find(selectors.room.waiting).shouldNotExist();
  });
});
