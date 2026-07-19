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

import type {
  Driver,
  Expect,
  Mock,
  Runtime,
  ScenarioApi,
  ScenarioContext,
} from "../../types";
import { createVitestDriver } from "./driver";

// A second actor means a second browser context + socket — jsdom has one render
// tree and no server, so the multi-context journeys stay Playwright-only.
function runScenario(body: (ctx: ScenarioContext) => Promise<void>) {
  return () =>
    body({
      driver: createVitestDriver(),
      openActor: () =>
        Promise.reject(
          new Error(
            "openActor (second actor) is E2E-only — run this journey under Playwright (pnpm test:e2e).",
          ),
        ) as Promise<Driver>,
    });
}

const scenario: ScenarioApi = Object.assign(
  (name: string, body: (ctx: ScenarioContext) => Promise<void>) =>
    it(name, runScenario(body)),
  {
    skip: (name: string, body: (ctx: ScenarioContext) => Promise<void>) =>
      it.skip(name, runScenario(body)),
  },
);

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
  scenario,
  beforeEach: (body) => vitestBeforeEach(body),
  afterEach: (body) => vitestAfterEach(body),
  expect,
  fn,
};
