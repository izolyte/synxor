// Integration level: mounts the real Join Room route through the Vitest Driver
// (router + tRPC providers, MSW backend) and drives the join flow end to end.
// Vitest-only — it reads the token store directly, which a browser E2E run can't —
// so it lives as a .spec, not a dual-run .scenario.

import { createVitestDriver } from "~test/kit/adapters/vitest/driver";
import { expect, suite, test } from "~test/kit";
import { selectors } from "~test/app";
import { roomTokenService } from "~/features/room/services/room-token.service";

suite("Join Room flow", () => {
  test("on success, persists the room token and leaves the page", async () => {
    const driver = createVitestDriver();
    await driver.backend.rpc("room.join").resolves({ roomToken: "tok-join", roomId: "room-1" });
    await driver.visit("/join");

    await driver.find(selectors.joinRoom.input).type("ABC123");

    // Navigation to /room/$roomCode 404s until the Room view ships; the 404 marker
    // is our "navigated away" anchor and makes the assertion wait for the async
    // mutation to resolve.
    await driver.find(selectors.app.notFound).shouldBeVisible();
    expect(roomTokenService.get("ABC123")).toBe("tok-join");
    await driver.find(selectors.joinRoom.heading).shouldNotExist();
  });

  test("on a rejected code, shows the inline error and stays on the page", async () => {
    const driver = createVitestDriver();
    // Not-found / expired Rooms come back as NOT_FOUND.
    await driver.backend.rpc("room.join").rejects({ code: "NOT_FOUND" });
    await driver.visit("/join");

    await driver.find(selectors.joinRoom.input).type("ZZ9999");

    await driver.find(selectors.joinRoom.error("rejected")).shouldBeVisible();
    await driver.find(selectors.joinRoom.heading).shouldBeVisible();
  });

  test("on a server fault, shows the retry message and stays on the page", async () => {
    const driver = createVitestDriver();
    // A 5xx is not the code's fault — surface the retryable connection message.
    await driver.backend.rpc("room.join").rejects({ code: "INTERNAL_SERVER_ERROR" });
    await driver.visit("/join");

    await driver.find(selectors.joinRoom.input).type("ZZ9999");

    await driver.find(selectors.joinRoom.error("network")).shouldBeVisible();
    await driver.find(selectors.joinRoom.heading).shouldBeVisible();
  });
});
