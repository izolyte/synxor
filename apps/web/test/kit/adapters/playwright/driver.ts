// The Playwright Driver: the same ports (test/kit/types.ts) satisfied
// against a real browser and a running app. A *.scenario.ts written to the
// Driver runs here as an E2E test without changing a line. `within` scopes to a
// region locator; `seed` primes localStorage before the first navigation. The
// backend seam uses page.route(); flows that must hit the real stack (socket,
// upload) simply don't mock.

import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

import type {
  BackendMock,
  Driver,
  Element,
  Screen,
  Selector,
  Stub,
} from "../../types";
import { trpcError, trpcOk, trpcProcedurePath } from "../../trpc-transport";

// Page and Locator share the getBy* family — either can root a scope.
type LocatorRoot = Pick<
  Page,
  "getByRole" | "getByLabel" | "getByTestId" | "getByText"
>;

function locatorFor(root: LocatorRoot, selector: Selector): Locator {
  if ("role" in selector) {
    return root.getByRole(
      selector.role as Parameters<LocatorRoot["getByRole"]>[0],
      selector.name ? { name: selector.name } : undefined,
    );
  }
  if ("label" in selector) return root.getByLabel(selector.label);
  if ("testId" in selector) return root.getByTestId(selector.testId);
  return root.getByText(selector.text);
}

function element(locator: () => Locator): Element {
  return {
    click: () => locator().click(),
    type: (text) => locator().pressSequentially(text),
    clear: () => locator().clear(),
    press: (key) => locator().press(key),
    focus: () => locator().focus(),
    check: () => locator().check(),
    shouldBeVisible: () => expect(locator()).toBeVisible(),
    shouldNotExist: () => expect(locator()).toHaveCount(0),
    shouldHaveText: (text) => expect(locator()).toHaveText(text),
    shouldHaveValue: (value) => expect(locator()).toHaveValue(value),
    shouldBeDisabled: () => expect(locator()).toBeDisabled(),
    shouldBeEnabled: () => expect(locator()).toBeEnabled(),
    shouldBeChecked: () => expect(locator()).toBeChecked(),
    shouldHaveAttribute: (name, value) =>
      expect(locator()).toHaveAttribute(name, value ?? /.*/),
  };
}

function makeScreen(root: LocatorRoot): Screen {
  return {
    find: (selector: Selector) => element(() => locatorFor(root, selector)),
    within: (region) => makeScreen(locatorFor(root, region)),
  };
}

function makeStub(page: Page, procedure: string): Stub {
  const url = `**${trpcProcedurePath(procedure)}`;
  return {
    async resolves(output) {
      await page.route(url, (route) => route.fulfill({ json: trpcOk(output) }));
    },
    async rejects(error) {
      await page.route(url, (route) =>
        route.fulfill({ status: 400, json: trpcError(error) }),
      );
    },
  };
}

export function createPlaywrightDriver(page: Page): Driver {
  const screen = makeScreen(page);
  const backend: BackendMock = {
    rpc: (procedure) => makeStub(page, procedure),
  };
  return {
    find: screen.find,
    within: screen.within,
    backend,
    async seed(state) {
      const entries = Object.entries(state.localStorage ?? {});
      if (entries.length === 0) return;
      await page.addInitScript((pairs) => {
        for (const [key, value] of pairs) window.localStorage.setItem(key, value);
      }, entries);
    },
    visit: (path) => page.goto(path).then(() => undefined),
  };
}
