import { CreateRoomForm } from "~/features/room/components/CreateRoomForm";
import { expect, fn, suite, test } from "~test/kit";
import { renderComponent } from "~test/kit/component";
import { selectors } from "~test/app";
import type { Expiry } from "~/features/room/types/expiry";

suite("CreateRoomForm", () => {
  test("submits the default expiry", async () => {
    const onCreate = fn<[Expiry], void>();
    const screen = renderComponent(
      <CreateRoomForm onCreate={onCreate} pending={false} error={false} />,
    );

    await screen.find(selectors.createRoom.cta).click();

    expect(onCreate.calls.length).toBe(1);
    expect(onCreate.calls[0][0]).toBe("24h");
  });

  test("submits the chosen expiry", async () => {
    const onCreate = fn<[Expiry], void>();
    const screen = renderComponent(
      <CreateRoomForm onCreate={onCreate} pending={false} error={false} />,
    );

    await screen.find(selectors.createRoom.expiryOption("7d")).click();
    await screen.find(selectors.createRoom.cta).click();

    expect(onCreate.calls[0][0]).toBe("7d");
  });

  test("disables submit while pending", async () => {
    const screen = renderComponent(<CreateRoomForm onCreate={fn()} pending error={false} />);
    await screen.find(selectors.createRoom.cta).shouldBeDisabled();
  });

  test("shows an error message on failure", async () => {
    const screen = renderComponent(<CreateRoomForm onCreate={fn()} pending={false} error />);
    await screen.find(selectors.createRoom.error).shouldBeVisible();
  });
});
