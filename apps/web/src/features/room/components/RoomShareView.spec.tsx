import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { selectors } from "~test/app";
import { DAY, HOUR, MINUTE } from "~/shared/constants/time";
import { RoomShareView } from "~/features/room/components/RoomShareView";

suite("RoomShareView", () => {
  test("shows the code, both copy actions, the countdown and waiting state", async () => {
    // Day-scale expiry → "2d 3h"; the +30m buffer keeps the hours floor stable
    // against the few ms that elapse before the countdown reads the clock.
    const expiresAt = new Date(Date.now() + 2 * DAY + 3 * HOUR + 30 * MINUTE).toISOString();
    const screen = renderComponent(<RoomShareView roomCode="ABC123" expiresAt={expiresAt} />);

    await screen.find(selectors.room.heading("ready")).shouldBeVisible();
    await screen.find(selectors.room.code("ABC123")).shouldBeVisible();
    await screen.find(selectors.room.copyCode).shouldBeVisible();
    await screen.find(selectors.room.copyLink).shouldBeVisible();
    await screen.find({ text: "Expires in 2d 3h" }).shouldBeVisible();
    await screen.find(selectors.room.waiting).shouldBeVisible();
  });

  test("without an expiry (Receiver session), renders without a countdown", async () => {
    const screen = renderComponent(<RoomShareView roomCode="ABC123" expiresAt={undefined} />);

    await screen.find(selectors.room.heading("ready")).shouldBeVisible();
    await screen.find(selectors.room.code("ABC123")).shouldBeVisible();
    await screen.find(selectors.room.copyCode).shouldBeVisible();
    await screen.find(selectors.room.waiting).shouldBeVisible();
  });
});
