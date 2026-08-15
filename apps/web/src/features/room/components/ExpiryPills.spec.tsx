import { ExpiryPills } from "~/features/room/components/ExpiryPills";
import { expect, fn, suite, test } from "~test/kit";
import { renderComponent } from "~test/kit/component";
import { selectors } from "~test/app";
import type { Expiry } from "~/features/room/types/expiry";

suite("ExpiryPills", () => {
  test("checks the pill matching its value", async () => {
    const screen = renderComponent(<ExpiryPills value="24h" onChange={fn()} />);
    await screen.find(selectors.createRoom.expiryOption("24h")).shouldBeChecked();
  });

  test("reports a newly chosen pill", async () => {
    const onChange = fn<[Expiry], void>();
    const screen = renderComponent(<ExpiryPills value="24h" onChange={onChange} />);

    await screen.find(selectors.createRoom.expiryOption("7d")).click();

    expect(onChange.calls.length).toBe(1);
    expect(onChange.calls[0][0]).toBe("7d");
  });

  test("disables the pills when disabled", async () => {
    const screen = renderComponent(<ExpiryPills value="24h" onChange={fn()} disabled />);
    await screen.find(selectors.createRoom.expiryOption("1h")).shouldBeDisabled();
  });
});
