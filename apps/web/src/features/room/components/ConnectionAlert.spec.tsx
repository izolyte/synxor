import { screen as rtlScreen } from "@testing-library/react";
import { expect } from "vitest";
import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { ConnectionAlert } from "~/features/room/components/ConnectionAlert";

suite("ConnectionAlert", () => {
  test("announces the lost connection as an alert, naming the fix", async () => {
    const screen = renderComponent(<ConnectionAlert onRefresh={() => {}} />);

    await screen.find({ text: "Lost connection. Refresh to continue." }).shouldBeVisible();
    // role="alert" so assistive tech hears it the moment it mounts.
    expect(rtlScreen.getByRole("alert")).toBeVisible();
  });

  test("runs the refresh action on demand", async () => {
    let refreshed = false;
    const screen = renderComponent(<ConnectionAlert onRefresh={() => (refreshed = true)} />);

    await screen.find({ role: "button", name: "Refresh" }).click();

    expect(refreshed).toBe(true);
  });
});
