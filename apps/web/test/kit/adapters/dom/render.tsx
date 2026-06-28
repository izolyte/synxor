// Component-level entry shared by jsdom runners: mount a component and get back
// the standard Screen surface. `expect` is injected so the same renderer works
// under any runner.

import type { ReactElement } from "react";
import { render, renderHook as rtlRenderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { HookResult, Screen } from "../../types";
import { type DomExpect, makeScreen } from "./queries";

export function renderComponent(ui: unknown, expect: DomExpect): Screen {
  render(ui as ReactElement);
  return makeScreen(userEvent.setup(), expect);
}

export function renderHook<T>(hook: () => T): HookResult<T> {
  const { result } = rtlRenderHook(hook);
  return {
    get current() {
      return result.current;
    },
  };
}
