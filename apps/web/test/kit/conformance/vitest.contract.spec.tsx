// The reference adapter (Vitest) running the shared conformance kit, plus smoke
// checks for the Vitest-only capabilities (seed, renderHook). When another driver
// adapter is built, it runs the very same `describeDriverContract` against its own
// fixture — green there means it behaves identically.

import { useState } from "react";

import { createVitestDriver } from "~test/kit/adapters/vitest/driver";
import { expect, suite, test } from "~test/kit";
import { renderComponent, renderHook } from "~test/kit/component";
import { TWO_LISTS_FIXTURE } from "./contract";
import { describeDriverContract } from "./driver-contract";

// Same fixture HTML as the Playwright run — one source, rendered into jsdom here
// so both adapters assert against identical markup.
describeDriverContract("vitest", async () =>
  renderComponent(<div dangerouslySetInnerHTML={{ __html: TWO_LISTS_FIXTURE }} />),
);

// Seed touches the environment directly, so it is checked per adapter rather
// than through the shared (port-only) kit.
suite("driver contract — vitest seed", () => {
  test("seed primes localStorage before the app loads", async () => {
    try {
      const driver = createVitestDriver();
      await driver.seed({ localStorage: { theme: "dark" } });
      expect(window.localStorage.getItem("theme")).toBe("dark");
    } finally {
      window.localStorage.clear();
    }
  });
});

suite("renderHook", () => {
  test("exposes a hook's current value", () => {
    const result = renderHook(() => useState(42)[0]);
    expect(result.current).toBe(42);
  });
});
