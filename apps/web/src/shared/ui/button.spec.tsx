// Component / UI level. Crosses the framework seam (TestKit) and the query
// surface (Screen), but not the Driver — a single component is mounted in
// isolation. No markup or copy in the assertions: the label comes from `copy`,
// the locator from `selectors`.

import { Button } from "~/shared/ui/button";
import { beforeEach, expect, fn, suite, test } from "~test/kit";
import { renderComponent } from "~test/kit/component";
import { copy, selectors } from "~test/app";

suite("Button", () => {
  test("shows its label", async () => {
    const screen = renderComponent(<Button>{copy.createRoom.cta}</Button>);
    await screen.find(selectors.createRoom.cta).shouldBeVisible();
  });

  test("calls its handler when clicked", async () => {
    const onClick = fn();
    const screen = renderComponent(<Button onClick={onClick}>{copy.createRoom.cta}</Button>);

    await screen.find(selectors.createRoom.cta).click();

    expect(onClick.calls.length).toBe(1);
  });

  test("submits on Enter", async () => {
    const onClick = fn();
    const screen = renderComponent(<Button onClick={onClick}>{copy.createRoom.cta}</Button>);

    await screen.find(selectors.createRoom.cta).press("Enter");

    expect(onClick.calls.length).toBe(1);
  });

  test("reflects the disabled state", async () => {
    const screen = renderComponent(<Button disabled>{copy.createRoom.cta}</Button>);
    await screen.find(selectors.createRoom.cta).shouldBeDisabled();
  });

  test("disables and marks itself busy while loading", async () => {
    const screen = renderComponent(<Button loading>{copy.createRoom.cta}</Button>);

    const cta = screen.find(selectors.createRoom.cta);
    await cta.shouldBeDisabled();
    await cta.shouldHaveAttribute("aria-busy", "true");
  });

  test("does not fire onClick while loading", async () => {
    const onClick = fn();
    const screen = renderComponent(
      <Button loading onClick={onClick}>
        {copy.createRoom.cta}
      </Button>,
    );

    await screen.find(selectors.createRoom.cta).click();

    expect(onClick.calls.length).toBe(0);
  });
});

// A one-test suite: `runs` is exactly 1 only if beforeEach runs before that test.
suite("beforeEach", () => {
  let runs = 0;
  beforeEach(() => {
    runs += 1;
  });

  test("runs once before this test", () => {
    expect(runs).toBe(1);
  });
});
