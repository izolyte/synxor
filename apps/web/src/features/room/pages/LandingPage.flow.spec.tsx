// Integration level: mounts the real landing route through the Vitest Driver
// (router + tRPC providers, MSW backend) and drives the create + join flows end to
// end. Vitest-only — it reads the token store directly, which a browser E2E run
// can't — so it lives as a .spec, not a dual-run .scenario.

import { createVitestDriver } from "~test/kit/adapters/vitest/driver";
import { expect, suite, test } from "~test/kit";
import { selectors } from "~test/app";
import { roomSessionService } from "~/features/room/services/room-session.service";

suite("Landing flow", () => {
  test("selecting an expiry checks it and unchecks the previous", async () => {
    const driver = createVitestDriver();
    await driver.visit("/");

    await driver.find(selectors.createRoom.expiryOption("7d")).click();

    await driver.find(selectors.createRoom.expiryOption("7d")).shouldBeChecked();
    await driver
      .find(selectors.createRoom.expiryOption("24h"))
      .shouldHaveAttribute("aria-checked", "false");
  });

  test("on success, persists the session and lands on the Room view", async () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const driver = createVitestDriver();
    await driver.backend
      .rpc("room.create")
      .resolves({ roomCode: "ABC123", roomToken: "tok-success", expiresAt });
    await driver.visit("/");

    await driver.find(selectors.createRoom.cta).click();

    // The Room view's heading is the "navigated away" anchor, and waiting on it lets
    // the async mutation, navigation, and the post-mount session read settle.
    await driver.find(selectors.room.heading("ready")).shouldBeVisible();
    // createdAt is stamped live at creation (it scales the expiry warning), so pull
    // it aside and assert it's a real instant; the rest of the shape is fixed.
    const { createdAt, ...rest } = roomSessionService.get("ABC123") ?? {};
    expect(rest).toEqual({ token: "tok-success", expiresAt, role: "sender" });
    expect(typeof createdAt === "string" && !Number.isNaN(Date.parse(createdAt))).toBe(true);
    await driver.find(selectors.createRoom.heading).shouldNotExist();
  });

  test("creates a room with a chosen expiry pill", async () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const driver = createVitestDriver();
    await driver.backend
      .rpc("room.create")
      .resolves({ roomCode: "ABC123", roomToken: "tok-1h", expiresAt });
    await driver.visit("/");

    // Pick a non-default expiry, then create through the same wired path.
    await driver.find(selectors.createRoom.expiryOption("1h")).click();
    await driver.find(selectors.createRoom.expiryOption("1h")).shouldBeChecked();
    await driver.find(selectors.createRoom.cta).click();

    await driver.find(selectors.room.heading("ready")).shouldBeVisible();
  });

  test("on failure, shows an error and stays on the page", async () => {
    const driver = createVitestDriver();
    await driver.backend.rpc("room.create").rejects({ code: "INTERNAL_SERVER_ERROR" });
    await driver.visit("/");

    await driver.find(selectors.createRoom.cta).click();

    await driver.find(selectors.createRoom.error).shouldBeVisible();
    await driver.find(selectors.createRoom.heading).shouldBeVisible();
  });

  test("offers a Receiver a path to the Join Room code entry", async () => {
    const driver = createVitestDriver();
    await driver.visit("/");

    await driver.find(selectors.createRoom.joinLink).click();

    await driver.find(selectors.joinRoom.heading).shouldBeVisible();
    await driver.find(selectors.joinRoom.input).shouldBeVisible();
  });
});
