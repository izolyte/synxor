import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { CountdownLine } from "~/features/room/components/CountdownLine";

suite("CountdownLine", () => {
  test("reads 'Expires in' while live", async () => {
    const screen = renderComponent(<CountdownLine label="1h 23m" phase="live" />);

    await screen.find({ text: "Expires in 1h 23m" }).shouldBeVisible();
  });

  test("warns and marks the phase when expiring", async () => {
    const screen = renderComponent(<CountdownLine label="4m 07s" phase="expiring" />);

    const line = screen.find({ text: "Expiring soon · 4m 07s" });
    await line.shouldBeVisible();
    await line.shouldHaveAttribute("data-phase", "expiring");
  });
});
