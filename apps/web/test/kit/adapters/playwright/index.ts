// The Playwright Runtime adapter. Same TestKit surface as the Vitest adapter,
// bound to @playwright/test. A scenario runs against a Playwright Driver built
// from the per-test `page` fixture, so it behaves the same as under Vitest.

import { expect as pwExpect, test as pwTest } from "@playwright/test";

import type { Expect, Mock, Runtime } from "../../types";
import { createPlaywrightDriver } from "./driver";

const expect = pwExpect as unknown as Expect;

function fn<Args extends unknown[], Return>(
  impl?: (...args: Args) => Return,
): Mock<Args, Return> {
  const calls: Args[] = [];
  const callable = (...args: Args): Return => {
    calls.push(args);
    return impl?.(...args) as Return;
  };
  Object.defineProperty(callable, "calls", { get: () => calls });
  return callable as unknown as Mock<Args, Return>;
}

export const runtime: Runtime = {
  suite: (name, body) => pwTest.describe(name, body),
  test: (name, body) => pwTest(name, () => Promise.resolve(body())),
  scenario: (name, body) =>
    pwTest(name, async ({ page }) => {
      await body({ driver: createPlaywrightDriver(page) });
    }),
  beforeEach: (body) =>
    pwTest.beforeEach(async () => {
      await body();
    }),
  afterEach: (body) =>
    pwTest.afterEach(async () => {
      await body();
    }),
  expect,
  fn,
};
