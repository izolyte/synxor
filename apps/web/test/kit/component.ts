// Component-level helpers — jsdom-only, so they live off the swappable Runtime.
// Imported only by *.spec.tsx (which run under Vitest); the E2E runtime never
// reaches here. Binds the dom renderer to Vitest's jest-dom-extended expect.

import { expect as vitestExpect } from "vitest";

import { type DomExpect } from "./adapters/dom/queries";
import {
  renderComponent as domRenderComponent,
  renderHook as domRenderHook,
} from "./adapters/dom/render";
import type { HookResult, Screen } from "./types";

export function renderComponent(ui: unknown): Screen {
  return domRenderComponent(ui, vitestExpect as unknown as DomExpect);
}

export function renderHook<T>(hook: () => T): HookResult<T> {
  return domRenderHook(hook);
}
