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

  test("a Sender session gets the Drop Zone", async () => {
    roomSessionService.store("SND123", {
      token: "tok-1",
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      role: "sender",
    });
    const driver = createVitestDriver();
    await driver.visit("/room/SND123");

    await driver.find({ testId: "drop-zone" }).shouldBeVisible();
  });

  test("a Receiver session gets the incoming feed instead of the Drop Zone", async () => {
    roomSessionService.store("RCV123", { token: "tok-1", role: "receiver" });
    const driver = createVitestDriver();
    await driver.visit("/room/RCV123");

    await driver
      .find({ text: "Files, text, and links the Sender shares will appear here." })
      .shouldBeVisible();
    await driver.find({ testId: "drop-zone" }).shouldNotExist();
  });

  test("without a held session, points back to creating a Room", async () => {
    const driver = createVitestDriver();
    await driver.visit("/room/NOPE12");

    await driver.find(selectors.room.heading("unavailable")).shouldBeVisible();
    await driver.find(selectors.room.createNew).shouldBeVisible();
  });

  test("populates the Transfer Log from the room.transfers history on mount", async () => {
    roomSessionService.store("LOG123", {
      token: "tok-1",
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      role: "receiver",
    });
    const driver = createVitestDriver();
    await driver.backend.rpc("room.transfers").resolves([
      {
        id: "t-hist",
        payloadType: "FILE",
        fileName: "history.pdf",
        fileSizeBytes: 1024,
        delivered: true,
        createdAt: "2026-01-01T10:00:00.000Z",
      },
    ]);

    await driver.visit("/room/LOG123");

    await driver.find({ text: "history.pdf" }).shouldBeVisible();
  });
});
