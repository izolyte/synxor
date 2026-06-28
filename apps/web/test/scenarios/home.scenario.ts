// Dual-run journey against the real index page. The same file runs as an E2E test
// under Playwright today, and under Vitest once route mounting is wired — the spec
// never changes, only the runner that collects it.

import { scenario, suite } from "~test/kit";
import { selectors } from "~test/app";

suite("Home", () => {
  scenario("shows the Transfer button", async ({ driver }) => {
    await driver.visit("/");
    await driver.find(selectors.app.transferCta).shouldBeVisible();
  });
});
