// The Playwright Runtime adapter. Same TestKit surface as the Vitest adapter,
// bound to @playwright/test. A scenario runs against a Playwright Driver built
// from the per-test `page` fixture, so it behaves the same as under Vitest.

import type { Browser, BrowserContext, Page } from "@playwright/test";
import { expect as pwExpect, test as pwTest } from "@playwright/test";

import type {
  Driver,
  Expect,
  Mock,
  Runtime,
  ScenarioApi,
  ScenarioContext,
} from "../../types";
import { createPlaywrightDriver } from "./driver";

const expect = pwExpect as unknown as Expect;

// Wraps a scenario body in a Playwright test: the primary actor rides the `page`
// fixture; `openActor` mints extra actors as fresh browser contexts (isolated
// storage + socket) and closes them when the test ends.
function runScenario(body: (ctx: ScenarioContext) => Promise<void>) {
  return async ({
    page,
    browser,
    baseURL,
  }: {
    page: Page;
    browser: Browser;
    baseURL?: string;
  }) => {
    const opened: BrowserContext[] = [];
    const openActor = async (): Promise<Driver> => {
      // A hand-built context doesn't inherit the config's use.baseURL (only the
      // page fixture does), so pass it through — else the actor's relative
      // navigations have no base to resolve against.
      const context = await browser.newContext({ baseURL });
      opened.push(context);
      return createPlaywrightDriver(await context.newPage());
    };
    try {
      await body({ driver: createPlaywrightDriver(page), openActor });
    } finally {
      await Promise.all(opened.map((context) => context.close()));
    }
  };
}

const scenario: ScenarioApi = Object.assign(
  (name: string, body: (ctx: ScenarioContext) => Promise<void>) =>
    pwTest(name, runScenario(body)),
  {
    skip: (name: string, body: (ctx: ScenarioContext) => Promise<void>) =>
      pwTest.skip(name, runScenario(body)),
  },
);

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
  scenario,
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
