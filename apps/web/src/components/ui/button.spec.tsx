// Component / UI level. Crosses the framework seam (TestKit) and the query
// surface (Screen), but not the Driver — a single component is mounted in
// isolation. No markup or copy in the assertions: the label comes from `copy`,
// the locator from `selectors`.

import { Button } from "~/components/ui/button";
import { beforeEach, expect, fn, renderComponent, suite, test } from "~test/kit";
import { copy, selectors } from "~test/app";

suite("Button", () => {
  test("shows its label", async () => {
    const screen = renderComponent(<Button>{copy.app.transfer}</Button>);
    await screen.find(selectors.app.transferCta).shouldBeVisible();
  });

  test("calls its handler when clicked", async () => {
    const onClick = fn();
    const screen = renderComponent(
      <Button onClick={onClick}>{copy.app.transfer}</Button>,
    );

    await screen.find(selectors.app.transferCta).click();

    expect(onClick.calls.length).toBe(1);
  });

  test("submits on Enter", async () => {
    const onClick = fn();
    const screen = renderComponent(
      <Button onClick={onClick}>{copy.app.transfer}</Button>,
    );

    await screen.find(selectors.app.transferCta).press("Enter");

    expect(onClick.calls.length).toBe(1);
  });

  test("reflects the disabled state", async () => {
    const screen = renderComponent(<Button disabled>{copy.app.transfer}</Button>);
    await screen.find(selectors.app.transferCta).shouldBeDisabled();
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
