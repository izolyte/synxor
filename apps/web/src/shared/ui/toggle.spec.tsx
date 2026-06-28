// Behavior contract for the shared Toggle primitive. Generic fixtures, no
// className assertions (CSS is off in jsdom). Note: Toggle isn't consumed in the
// app yet — this pins the primitive's contract ahead of first use.

import { Toggle } from "~/shared/ui/toggle";
import { expect, fn, suite, test } from "~test/kit";
import { renderComponent } from "~test/kit/component";

suite("Toggle", () => {
  test("renders its label", async () => {
    const screen = renderComponent(<Toggle>Bold</Toggle>);
    await screen.find({ role: "button", name: "Bold" }).shouldBeVisible();
  });

  test("reflects the pressed state when controlled", async () => {
    const screen = renderComponent(<Toggle pressed>Bold</Toggle>);
    await screen.find({ role: "button", name: "Bold" }).shouldHaveAttribute("aria-pressed", "true");
  });

  test("reports press changes on click", async () => {
    const onPressedChange = fn<[boolean], void>();
    const screen = renderComponent(<Toggle onPressedChange={onPressedChange}>Bold</Toggle>);
    await screen.find({ role: "button", name: "Bold" }).click();
    expect(onPressedChange.calls[0][0]).toBe(true);
  });

  test("is disabled when disabled", async () => {
    const screen = renderComponent(<Toggle disabled>Bold</Toggle>);
    await screen.find({ role: "button", name: "Bold" }).shouldBeDisabled();
  });
});
