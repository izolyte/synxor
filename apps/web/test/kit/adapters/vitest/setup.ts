// Vitest global setup (referenced by vitest.config.ts setupFiles).
// Registers jest-dom matchers, tears down the DOM between specs, and runs the
// MSW server for the whole suite so backend mocks are isolated per test.

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./backend";

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

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
  sessionStorage.clear();
});
afterAll(() => server.close());
