// Dual-run journey against the real Join Room page. Runs as an E2E test under
// Playwright today, and under Vitest (VitestDriver.visit mounts the route) — the
// spec never changes, only the runner that collects it.

import { scenario, suite } from "~test/kit";
import { selectors } from "~test/app";

suite("Join Room", () => {
  scenario("offers a Room Code field and a join action", async ({ driver }) => {
    await driver.visit("/join");

    await driver.find(selectors.joinRoom.heading).shouldBeVisible();
    await driver.find(selectors.joinRoom.input).shouldBeVisible();
    await driver.find(selectors.joinRoom.cta).shouldBeVisible();
  });
});
