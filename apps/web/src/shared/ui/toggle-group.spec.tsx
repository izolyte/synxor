// Behavior contract for the shared ToggleGroup primitive (single-select). Generic
// fixtures, no app vocabulary — and no className assertions (CSS is off in jsdom;
// keyboard/roving is Radix's own concern).

import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "~/shared/ui/toggle-group";
import { expect, fn, suite, test } from "~test/kit";
import { renderComponent } from "~test/kit/component";

function Host({ onValueChange }: { onValueChange?: (value: string) => void }) {
  const [value, setValue] = useState("b");
  return (
    <ToggleGroup
      type="single"
      value={value}
      aria-label="letters"
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
    >
      <ToggleGroupItem value="a">A</ToggleGroupItem>
      <ToggleGroupItem value="b">B</ToggleGroupItem>
      <ToggleGroupItem value="c">C</ToggleGroupItem>
    </ToggleGroup>
  );
}

suite("ToggleGroup", () => {
  test("marks the current value as checked", async () => {
    const screen = renderComponent(<Host />);
    await screen.find({ role: "radio", name: "B" }).shouldBeChecked();
  });

  test("selects an item on click", async () => {
    const screen = renderComponent(<Host />);
    await screen.find({ role: "radio", name: "C" }).click();
    await screen.find({ role: "radio", name: "C" }).shouldBeChecked();
  });

  test("reports the chosen value", async () => {
    const onValueChange = fn<[string], void>();
    const screen = renderComponent(<Host onValueChange={onValueChange} />);
    await screen.find({ role: "radio", name: "A" }).click();
    expect(onValueChange.calls[0][0]).toBe("a");
  });

  test("disables its items when disabled", async () => {
    const screen = renderComponent(
      <ToggleGroup type="single" value="b" disabled aria-label="letters">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>,
    );
    await screen.find({ role: "radio", name: "A" }).shouldBeDisabled();
  });
});
