// Smoke test for a generic layout wrapper: a literal fixture is fine here.
import { CenteredScreen } from "~/shared/components/CenteredScreen";
import { suite, test } from "~test/kit";
import { renderComponent } from "~test/kit/component";

suite("CenteredScreen", () => {
  test("renders its children", async () => {
    const screen = renderComponent(
      <CenteredScreen>
        <span>centered content</span>
      </CenteredScreen>,
    );
    await screen.find({ text: "centered content" }).shouldBeVisible();
  });
});
