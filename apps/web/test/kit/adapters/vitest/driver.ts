// The Vitest Driver: drives the app in jsdom (component/integration level), owns
// an MSW backend, and seeds client state. Query logic is the shared dom/ module
// with Vitest's `expect` injected. `visit` mounts the real router at a path with
// a memory history — the app's own providers (query client, tRPC) come along, and
// MSW owns the network. This adapter is intentionally app-aware; the portable
// surface stays in dom/queries.ts.

import { createElement } from "react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { expect as vitestExpect } from "vitest";

import type { Driver } from "../../types";
import { type DomExpect, makeScreen } from "../dom/queries";
import { createBackend } from "./backend";
import { createRouter } from "~/router";

export function createVitestDriver(): Driver {
  const user = userEvent.setup();
  const screen = makeScreen(user, vitestExpect as unknown as DomExpect);
  const backend = createBackend();
  // Kept from the last visit so currentPath can report where navigation landed.
  let router: ReturnType<typeof createRouter> | null = null;

  return {
    ...screen,
    backend,
    async seed(state) {
      for (const [key, value] of Object.entries(state.localStorage ?? {})) {
        window.localStorage.setItem(key, value);
      }
    },
    async visit(path) {
      router = createRouter({
        history: createMemoryHistory({ initialEntries: [path] }),
      });
      render(createElement(RouterProvider, { router }));
      await router.load();
    },
    async currentPath() {
      return router?.state.location.href ?? "/";
    },
  };
}
