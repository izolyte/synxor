// Dual-run journey against the real Create Room page (the app's home route). Runs
// as an E2E test under Playwright today, and under Vitest once route mounting is
// wired — the spec never changes, only the runner that collects it.

import { scenario, suite } from "~test/kit";
import { selectors } from "~test/app";

suite("Create Room", () => {
  scenario("offers the expiry options and a create action", async ({ driver }) => {
    await driver.visit("/");

    await driver.find(selectors.createRoom.heading).shouldBeVisible();
    await driver.find(selectors.createRoom.expiryOption("1h")).shouldBeVisible();
    await driver.find(selectors.createRoom.expiryOption("24h")).shouldBeVisible();
    await driver.find(selectors.createRoom.expiryOption("7d")).shouldBeVisible();
    await driver.find(selectors.createRoom.cta).shouldBeVisible();
  });

  scenario("defaults the expiry to 24 hours", async ({ driver }) => {
    await driver.visit("/");
    await driver.find(selectors.createRoom.expiryOption("24h")).shouldBeChecked();
  });
});
