// Vitest global setup (referenced by vitest.config.ts setupFiles).
// Registers jest-dom matchers, tears down the DOM between specs, and runs the
// MSW server for the whole suite so backend mocks are isolated per test.

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import { server } from "./backend";

// The Room view opens a Socket.io connection from useRoomSocket on mount. Specs
// assert presence behavior with an injected fake; this global stub just stops the
// default factory from dialing a real server (which MSW would flag as unhandled).
vi.mock("socket.io-client", () => ({
  io: () => ({ on() {}, off() {}, disconnect() {}, connected: false }),
}));

// jsdom has no layout engine; TanStack Router's scroll restoration calls
// window.scrollTo, which jsdom otherwise logs as "Not implemented".
window.scrollTo = (() => {}) as unknown as typeof window.scrollTo;

// jsdom ships no ResizeObserver; input-otp (the Room Code field) constructs one on
// mount. A no-op stub is enough — specs assert behavior, not layout measurement.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// input-otp polls document.elementFromPoint on a timer to mirror the caret; jsdom
// has no layout, so it's absent and the timer throws after the test ends. Stub it.
document.elementFromPoint ??= (() => null) as typeof document.elementFromPoint;

// input-otp schedules focus-sync setTimeouts (0/10/50ms) that it doesn't clear on
// unmount. If one fires after Vitest tears down the jsdom environment, React reads
// a gone `window` and throws an uncaught "window is not defined" — flaking the
// suite (~1/3 of runs on slower CI). #63 disabled input-otp's password-manager
// timers; these focus-sync ones aren't gated by that, so track every timeout and
// clear whatever a test leaves pending in afterEach. Nothing legitimately needs a
// timer to survive the test that scheduled it.
const pendingTimeouts = new Set<ReturnType<typeof setTimeout>>();
const nativeSetTimeout = globalThis.setTimeout;
// Capture native clearTimeout too: a test using vi.useFakeTimers() swaps the
// global, and the fake can't clear the real timers we tracked.
const nativeClearTimeout = globalThis.clearTimeout;
globalThis.setTimeout = function trackedSetTimeout(
  handler: TimerHandler,
  timeout?: number,
  ...args: unknown[]
): ReturnType<typeof setTimeout> {
  const id = nativeSetTimeout(
    (...cbArgs: unknown[]) => {
      pendingTimeouts.delete(id);
      if (typeof handler === "function") (handler as (...a: unknown[]) => void)(...cbArgs);
    },
    timeout,
    ...args,
  );
  pendingTimeouts.add(id);
  return id;
} as unknown as typeof setTimeout;

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  // finally: if cleanup() throws on a bad unmount, still clear the leaked timers.
  try {
    cleanup();
  } finally {
    for (const id of pendingTimeouts) nativeClearTimeout(id);
    pendingTimeouts.clear();
  }
  server.resetHandlers();
  localStorage.clear();
  sessionStorage.clear();
});
afterAll(() => server.close());
