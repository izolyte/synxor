import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { WaitingForReceiver } from "~/features/room/components/WaitingForReceiver";

suite("WaitingForReceiver", () => {
  test("shows the waiting label", async () => {
    const screen = renderComponent(<WaitingForReceiver />);

    await screen.find({ text: "Waiting for Receiver" }).shouldBeVisible();
  });

  test("names a single connected Receiver", async () => {
    const screen = renderComponent(<WaitingForReceiver receiverCount={1} />);

    await screen.find({ text: "Receiver connected" }).shouldBeVisible();
  });

  test("pluralises the count for multiple Receivers", async () => {
    const screen = renderComponent(<WaitingForReceiver receiverCount={3} />);

    await screen.find({ text: "3 Receivers connected" }).shouldBeVisible();
  });

  test("reads as reconnecting when the socket drops, even with a held count", async () => {
    const screen = renderComponent(<WaitingForReceiver status="disconnected" receiverCount={1} />);

    await screen.find({ text: "Reconnecting…" }).shouldBeVisible();
  });

  test("exposes presence as a polite live region", async () => {
    const screen = renderComponent(<WaitingForReceiver receiverCount={1} />);

    await screen.find({ role: "status" }).shouldHaveText("Receiver connected");
  });
});
