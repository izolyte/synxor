import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { ScreenHeader } from "~/shared/components/ScreenHeader";

suite("ScreenHeader", () => {
  test("renders the title as a heading", async () => {
    const screen = renderComponent(<ScreenHeader title="New Room" />);

    await screen.find({ role: "heading", name: "New Room" }).shouldBeVisible();
  });

  test("renders an optional description carrying the given id", async () => {
    const screen = renderComponent(
      <ScreenHeader title="Join Room" description="Enter the code." descriptionId="hint" />,
    );

    await screen.find({ text: "Enter the code." }).shouldHaveAttribute("id", "hint");
  });
});
