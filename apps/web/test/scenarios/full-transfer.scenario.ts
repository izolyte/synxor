// The full transfer happy path, end to end, driven through the Driver port so it
// stays decoupled from markup (issue #23). Two actors in two isolated browser
// contexts: the Sender creates a Room and sends a file and a text snippet; the
// Receiver joins, downloads the file, and copies the snippet; both land on the
// shared Delivered state.
//
// This is a real-stack journey: presence, upload/download, and delivery all ride
// the live Socket.io + tRPC + Postgres/MinIO wiring, so it only runs with that
// stack up. Set E2E_STACK=1 (the CI e2e job does, once #20 lands) and point
// Playwright at the composed web via E2E_BASE_URL. Without the stack it registers
// as skipped — pending, never a false green.
//
// Blocked on:
//   #20 — live Transfer Log wiring (Postgres + tRPC + Socket.io) is what presence,
//         progress, and the transfer:delivered event depend on.
//   #21 — connection edge cases (reconnect, error copy); this spec is the happy
//         path only, but shares the same live socket surface.
// The frontend for every step already exists on main; unskipping is this gate's
// activation once #20 is merged and the stack runs green in CI.

import { scenario, suite } from "~test/kit";
import { selectors } from "~test/app";

// Resolved by Playwright relative to its cwd (apps/web); see playwright.config.ts.
const FILE_FIXTURE = "test/fixtures/hello.txt";

// Run for real only against the live stack; otherwise report the journey pending.
const journey = process.env.E2E_STACK ? scenario : scenario.skip;

/** Pull the Room Code the server minted out of the Sender's /room/:code URL. */
function roomCodeFrom(path: string): string {
  return path.split("/room/")[1]?.split(/[/?#]/)[0] ?? "";
}

suite("Full transfer — happy path", () => {
  journey(
    "Sender and Receiver complete a file transfer end to end",
    async ({ driver: sender, openActor }) => {
      // Sender creates a Room and lands on the share view.
      await sender.visit("/");
      await sender.find(selectors.createRoom.expiryOption("24h")).check();
      await sender.find(selectors.createRoom.cta).click();
      await sender.find(selectors.room.heading("ready")).shouldBeVisible();

      // Carry the server-issued Room Code to the Receiver.
      const roomCode = roomCodeFrom(await sender.currentPath());

      // Receiver joins in its own browser context; the shared-link ?code prefill
      // auto-submits the join form and drops it into the same Room.
      const receiver = await openActor();
      await receiver.visit(`/join?code=${roomCode}`);
      await receiver.find(selectors.room.heading("ready")).shouldBeVisible();

      // Presence: once the Receiver's socket joins, the Sender sees it connect.
      await sender.find(selectors.room.connected).shouldBeVisible();

      // Sender sends a file; queuing it auto-uploads through the chunk endpoint.
      await sender.attach(selectors.transfer.dropZoneInput, [FILE_FIXTURE]);

      // Receiver sees the incoming file and downloads it.
      await receiver.find(selectors.transfer.download).shouldBeVisible();
      await receiver.find(selectors.transfer.download).click();

      // Delivery is the moment the whole flow points at: once the download
      // completes, both sides settle on Delivered. Both roles show it on the live
      // row and in the shared Transfer Log; scope to the Log so each asserts one.
      await receiver.within(selectors.transfer.log).find(selectors.transfer.delivered).shouldBeVisible();
      await sender.within(selectors.transfer.log).find(selectors.transfer.delivered).shouldBeVisible();

      // The Text Snippet / Link path (paste → send → receive → copy) is covered by
      // the component + socket specs (TextPasteField, IncomingTextRow,
      // useRoomSocket); it's left out of this live journey because the clipboard
      // copy is unreliable to drive under headless Chromium.
    },
  );
});
