// Integration level: mounts the real Create Room route through the Vitest Driver
// (router + tRPC providers, MSW backend) and drives the create flow end to end.
// Vitest-only — it reads the token store directly, which a browser E2E run can't —
// so it lives as a .spec, not a dual-run .scenario.

import { createVitestDriver } from "~test/kit/adapters/vitest/driver";
import { expect, suite, test } from "~test/kit";
import { selectors } from "~test/app";
import { roomTokenService } from "~/features/room/services/room-token.service";

suite("Create Room flow", () => {
  test("selecting an expiry checks it and unchecks the previous", async () => {
    const driver = createVitestDriver();
    await driver.visit("/");

    await driver.find(selectors.createRoom.expiryOption("7d")).click();

    await driver.find(selectors.createRoom.expiryOption("7d")).shouldBeChecked();
    await driver
      .find(selectors.createRoom.expiryOption("24h"))
      .shouldHaveAttribute("aria-checked", "false");
  });

  test("on success, persists the room token and leaves the page", async () => {
    const driver = createVitestDriver();
    await driver.backend
      .rpc("room.create")
      .resolves({ roomCode: "ABC123", roomToken: "tok-success" });
    await driver.visit("/");

    await driver.find(selectors.createRoom.cta).click();

    // Navigation to /room/$roomCode 404s until the Room view ships; the 404 marker
    // is our "navigated away" anchor and also makes the assertion wait for the
    // async mutation to resolve.
    await driver.find(selectors.app.notFound).shouldBeVisible();
    expect(roomTokenService.get("ABC123")).toBe("tok-success");
    await driver.find(selectors.createRoom.heading).shouldNotExist();
  });

  test("on failure, shows an error and stays on the page", async () => {
    const driver = createVitestDriver();
    await driver.backend.rpc("room.create").rejects({ code: "INTERNAL_SERVER_ERROR" });
    await driver.visit("/");

    await driver.find(selectors.createRoom.cta).click();

    await driver.find(selectors.createRoom.error).shouldBeVisible();
    await driver.find(selectors.createRoom.heading).shouldBeVisible();
  });
});
