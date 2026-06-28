// The Vitest Driver: drives the app in jsdom (component/integration level), owns
// an MSW backend, and seeds client state. Query logic is the shared dom/ module
// with Vitest's `expect` injected. `visit` mounts a route once the app has routes
// to mount; until then it fails loudly rather than pretending.

import userEvent from "@testing-library/user-event";
import { expect as vitestExpect } from "vitest";

import type { Driver } from "../../types";
import { type DomExpect, makeScreen } from "../dom/queries";
import { createBackend } from "./backend";

export function createVitestDriver(): Driver {
  const user = userEvent.setup();
  const screen = makeScreen(user, vitestExpect as unknown as DomExpect);
  const backend = createBackend();

  return {
    find: screen.find,
    within: screen.within,
    backend,
    async seed(state) {
      for (const [key, value] of Object.entries(state.localStorage ?? {})) {
        window.localStorage.setItem(key, value);
      }
    },
    async visit() {
      throw new Error(
        "VitestDriver.visit is not wired yet — the app has no routes to mount. " +
          "Implement route mounting when the first page lands, or use " +
          "renderComponent for component-level specs.",
      );
    },
  };
}
