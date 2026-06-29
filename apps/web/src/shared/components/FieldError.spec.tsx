import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { FieldError } from "~/shared/components/FieldError";

suite("FieldError", () => {
  test("shows the message and carries the given id", async () => {
    const screen = renderComponent(<FieldError id="e1">Something broke</FieldError>);

    const message = screen.find({ text: "Something broke" });
    await message.shouldBeVisible();
    await message.shouldHaveAttribute("id", "e1");
  });
});
