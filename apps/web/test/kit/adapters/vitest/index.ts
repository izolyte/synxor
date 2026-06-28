// The Vitest Runtime adapter: binds the TestKit onto Vitest. suite/test map to
// describe/it; a scenario runs against a fresh Vitest Driver; expect and fn are
// narrowed to the portable surface in types.ts.

import {
  afterEach as vitestAfterEach,
  beforeEach as vitestBeforeEach,
  describe,
  expect as vitestExpect,
  it,
  vi,
} from "vitest";

import type { Expect, Mock, Runtime } from "../../types";
import { createVitestDriver } from "./driver";

// Runtime keeps the full Vitest matchers; the type narrows callers to the
// curated, swappable subset.
const expect = vitestExpect as unknown as Expect;

function fn<Args extends unknown[], Return>(
  impl?: (...args: Args) => Return,
): Mock<Args, Return> {
  const spy = vi.fn(impl as (...args: unknown[]) => unknown);
  const callable = (...args: Args) => spy(...args) as Return;
  Object.defineProperty(callable, "calls", { get: () => spy.mock.calls });
  return callable as unknown as Mock<Args, Return>;
}

export const runtime: Runtime = {
  suite: (name, body) => describe(name, body),
  test: (name, body) => it(name, body),
  scenario: (name, body) =>
    it(name, async () => {
      await body({ driver: createVitestDriver() });
    }),
  beforeEach: (body) => vitestBeforeEach(body),
  afterEach: (body) => vitestAfterEach(body),
  expect,
  fn,
};
