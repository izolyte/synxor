import { expect, vi } from "vitest";
import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { selectors } from "~test/app";
import { WaitingForReceiver } from "~/features/room/components/WaitingForReceiver";

const JOIN_URL = "http://localhost/join?code=ABC123";

suite("WaitingForReceiver", () => {
  test("is the share surface — invite, code, both actions, and a scannable QR", async () => {
    const screen = renderComponent(<WaitingForReceiver roomCode="ABC123" joinUrl={JOIN_URL} />);

    await screen.find(selectors.room.shareHeading).shouldBeVisible();
    await screen.find(selectors.room.code("ABC123")).shouldBeVisible();
    await screen.find(selectors.room.copyCode).shouldBeVisible();
    await screen.find(selectors.room.copyLink).shouldBeVisible();
    await screen.find(selectors.room.qr).shouldBeVisible();
    await screen.find(selectors.room.waiting).shouldBeVisible();
  });

  test("softens the cue to reconnecting while the socket is down", async () => {
    const screen = renderComponent(
      <WaitingForReceiver roomCode="ABC123" joinUrl={JOIN_URL} status="disconnected" />,
    );

    await screen.find({ text: "Reconnecting…" }).shouldBeVisible();
    await screen.find(selectors.room.waiting).shouldNotExist();
  });

  test("hands the join link to the platform share sheet when there is one", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true, writable: true });

    try {
      const screen = renderComponent(<WaitingForReceiver roomCode="ABC123" joinUrl={JOIN_URL} />);
      await screen.find(selectors.room.copyLink).click();

      expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: JOIN_URL }));
    } finally {
      delete (navigator as { share?: unknown }).share;
    }
  });

  test("falls back to copying the link where there is no share sheet", async () => {
    // jsdom has no navigator.share, so the same action copies instead — userEvent
    // backs the clipboard, so writeText resolves and the confirmation shows.
    const screen = renderComponent(<WaitingForReceiver roomCode="ABC123" joinUrl={JOIN_URL} />);

    await screen.find(selectors.room.copyLink).click();

    await screen.find(selectors.room.copiedLink).shouldBeVisible();
  });
});
