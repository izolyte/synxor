import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { WaitingForReceiver } from "~/features/room/components/WaitingForReceiver";

suite("WaitingForReceiver", () => {
  test("shows the waiting label", async () => {
    const screen = renderComponent(<WaitingForReceiver />);

    await screen.find({ text: "Waiting for Receiver" }).shouldBeVisible();
  });
});
