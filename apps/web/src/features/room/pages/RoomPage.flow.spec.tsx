// Integration level: mounts the real Room view route through the Vitest Driver and
// reads the per-tab session store directly (Vitest-only) to set up each case — so
// it's a .spec, not a dual-run .scenario.

import { createVitestDriver } from "~test/kit/adapters/vitest/driver";
import { suite, test } from "~test/kit";
import { selectors } from "~test/app";
import { roomSessionService } from "~/features/room/services/room-session.service";

suite("Room view", () => {
  test("with a held session, shows the code and the ways to share it", async () => {
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    roomSessionService.store("ABC123", { token: "tok-1", expiresAt });
    const driver = createVitestDriver();
    await driver.visit("/room/ABC123");

    await driver.find(selectors.room.heading("ready")).shouldBeVisible();
    await driver.find(selectors.room.code("ABC123")).shouldBeVisible();
    await driver.find(selectors.room.copyCode).shouldBeVisible();
    await driver.find(selectors.room.copyLink).shouldBeVisible();
    await driver.find(selectors.room.waiting).shouldBeVisible();
  });

  test("copies the Room Code and confirms", async () => {
    roomSessionService.store("ABC123", {
      token: "tok-1",
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    });
    const driver = createVitestDriver();
    await driver.visit("/room/ABC123");

    await driver.find(selectors.room.copyCode).click();

    await driver.find(selectors.room.copiedCode).shouldBeVisible();
  });

  test("copies the join link and confirms", async () => {
    roomSessionService.store("ABC123", {
      token: "tok-1",
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    });
    const driver = createVitestDriver();
    await driver.visit("/room/ABC123");

    await driver.find(selectors.room.copyLink).click();

    await driver.find(selectors.room.copiedLink).shouldBeVisible();
  });

  test("with an expired session, collapses to the expired notice", async () => {
    roomSessionService.store("OLD123", {
      token: "tok-1",
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    const driver = createVitestDriver();
    await driver.visit("/room/OLD123");

    await driver.find(selectors.room.heading("expired")).shouldBeVisible();
    await driver.find(selectors.room.createNew).shouldBeVisible();
  });

  test("without a held session, points back to creating a Room", async () => {
    const driver = createVitestDriver();
    await driver.visit("/room/NOPE12");

    await driver.find(selectors.room.heading("unavailable")).shouldBeVisible();
    await driver.find(selectors.room.createNew).shouldBeVisible();
  });
});
