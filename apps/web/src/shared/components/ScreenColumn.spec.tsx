import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { ScreenColumn } from "~/shared/components/ScreenColumn";

suite("ScreenColumn", () => {
  test("renders its children", async () => {
    const screen = renderComponent(
      <ScreenColumn>
        <p>inside</p>
      </ScreenColumn>,
    );

    await screen.find({ text: "inside" }).shouldBeVisible();
  });
});
