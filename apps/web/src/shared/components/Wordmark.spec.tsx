// Smoke test for a generic presentational primitive: a literal fixture is fine
// here (no app-surface locator is involved).
import { Wordmark } from "~/shared/components/Wordmark";
import { suite, test } from "~test/kit";
import { renderComponent } from "~test/kit/component";

suite("Wordmark", () => {
  test("renders its text", async () => {
    const screen = renderComponent(<Wordmark>synxor</Wordmark>);
    await screen.find({ text: "synxor" }).shouldBeVisible();
  });
});
