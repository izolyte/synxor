// Selector -> Testing Library, shared by every jsdom runner (Vitest, Jest, …).
// Runner-agnostic: the only runner-specific dependency, `expect`, is injected, so
// the same query/assertion logic backs each runner adapter. Queries run against a
// scope (the document by default, or a region after `within`).

import { screen, within as tlWithin } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";

import type { Element, Screen, Selector } from "../../types";

// The jest-dom matcher surface these queries use. Vitest's and Jest's `expect`
// both satisfy it once jest-dom is registered.
interface Matchers {
  toBeVisible(): void;
  toBeNull(): void;
  toHaveTextContent(text: string): void;
  toHaveValue(value: string): void;
  toHaveAttribute(name: string, value?: string): void;
  toMatch(value: RegExp): void;
  toBeDisabled(): void;
  toBeEnabled(): void;
  toBeChecked(): void;
}
export type DomExpect = (actual: unknown) => Matchers;

type Bound = ReturnType<typeof tlWithin>;
type Scope = () => Promise<Bound>;

function findOne(q: Bound, selector: Selector): Promise<HTMLElement> {
  if ("role" in selector) {
    return q.findByRole(
      selector.role,
      selector.name ? { name: selector.name } : undefined,
    );
  }
  if ("label" in selector) return q.findByLabelText(selector.label);
  if ("testId" in selector) return q.findByTestId(selector.testId);
  return q.findByText(selector.text);
}

function queryOne(q: Bound, selector: Selector): HTMLElement | null {
  if ("role" in selector) {
    return q.queryByRole(
      selector.role,
      selector.name ? { name: selector.name } : undefined,
    );
  }
  if ("label" in selector) return q.queryByLabelText(selector.label);
  if ("testId" in selector) return q.queryByTestId(selector.testId);
  return q.queryByText(selector.text);
}

function element(
  scope: Scope,
  selector: Selector,
  user: UserEvent,
  expect: DomExpect,
): Element {
  const find = async () => findOne(await scope(), selector);
  const query = async () => queryOne(await scope(), selector);
  return {
    async click() {
      await user.click(await find());
    },
    async type(text) {
      await user.type(await find(), text);
    },
    async clear() {
      await user.clear(await find());
    },
    async press(key) {
      (await find()).focus();
      await user.keyboard(`{${key}}`);
    },
    async focus() {
      (await find()).focus();
    },
    async check() {
      const el = await find();
      if (!(el as HTMLInputElement).checked) await user.click(el);
    },
    async shouldBeVisible() {
      expect(await find()).toBeVisible();
    },
    async shouldNotExist() {
      expect(await query()).toBeNull();
    },
    async shouldHaveText(text) {
      expect(await find()).toHaveTextContent(text);
    },
    async shouldHaveValue(value) {
      expect(await find()).toHaveValue(value);
    },
    async shouldBeDisabled() {
      expect(await find()).toBeDisabled();
    },
    async shouldBeEnabled() {
      expect(await find()).toBeEnabled();
    },
    async shouldBeChecked() {
      expect(await find()).toBeChecked();
    },
    async shouldHaveAttribute(name, value) {
      const el = await find();
      if (value === undefined) expect(el).toHaveAttribute(name);
      else if (value instanceof RegExp) expect(el.getAttribute(name)).toMatch(value);
      else expect(el).toHaveAttribute(name, value);
    },
  };
}

export function makeScreen(
  user: UserEvent,
  expect: DomExpect,
  scope: Scope = async () => screen,
): Screen {
  return {
    find: (selector: Selector) => element(scope, selector, user, expect),
    within: (region) =>
      makeScreen(
        user,
        expect,
        async () => tlWithin(await findOne(await scope(), region)),
      ),
    // Real files off disk are an E2E concern; jsdom has no OS picker to satisfy
    // from a path. A component test that needs an upload should stage a File
    // through its own handler instead.
    attach: () =>
      Promise.reject(
        new Error("attach (file upload) is E2E-only — run this journey under Playwright."),
      ),
  };
}
