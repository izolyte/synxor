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

  test("reads 'Expiring…' during the sealing window, not a zero countdown", async () => {
    // Past the TTL a Transfer may still be finishing; the label is meaningless, so
    // it drops to a status word rather than "0m left".
    const screen = renderComponent(<CountdownLine label="0s" phase="expired" />);

    const line = screen.find({ text: "Expiring…" });
    await line.shouldBeVisible();
    await line.shouldHaveAttribute("data-phase", "expired");
  });
});
