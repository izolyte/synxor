import { ExpiryField } from "~/features/room/components/ExpiryField";
import { expect, fn, suite, test } from "~test/kit";
import { renderComponent } from "~test/kit/component";
import { selectors } from "~test/app";
import type { Expiry } from "~/features/room/types/expiry";

suite("ExpiryField", () => {
  test("checks the option matching its value", async () => {
    const screen = renderComponent(<ExpiryField value="24h" onChange={fn()} />);
    await screen.find(selectors.createRoom.expiryOption("24h")).shouldBeChecked();
  });

  test("reports a newly chosen option", async () => {
    const onChange = fn<[Expiry], void>();
    const screen = renderComponent(<ExpiryField value="24h" onChange={onChange} />);

    await screen.find(selectors.createRoom.expiryOption("7d")).click();

    expect(onChange.calls.length).toBe(1);
    expect(onChange.calls[0][0]).toBe("7d");
  });

  test("ignores re-pressing the active option, never emitting empty", async () => {
    const onChange = fn<[Expiry], void>();
    const screen = renderComponent(<ExpiryField value="24h" onChange={onChange} />);

    // Radix single-select fires onValueChange("") here; the empty-guard must swallow it.
    await screen.find(selectors.createRoom.expiryOption("24h")).click();

    expect(onChange.calls.length).toBe(0);
  });

  test("disables the options when disabled", async () => {
    const screen = renderComponent(<ExpiryField value="24h" onChange={fn()} disabled />);
    await screen.find(selectors.createRoom.expiryOption("1h")).shouldBeDisabled();
  });
});
