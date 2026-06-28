// Vitest global setup (referenced by vitest.config.ts setupFiles).
// Registers jest-dom matchers, tears down the DOM between specs, and runs the
// MSW server for the whole suite so backend mocks are isolated per test.

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./backend";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
  sessionStorage.clear();
});
afterAll(() => server.close());
