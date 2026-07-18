import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { StallNotice } from "~/features/room/components/StallNotice";

suite("StallNotice", () => {
  test("renders nothing until the Transfer actually stalls", async () => {
    const screen = renderComponent(<StallNotice state={null} />);

    await screen.find({ text: "Slow connection…" }).shouldNotExist();
  });

  test("reads a slow connection as a status, not an error", async () => {
    const screen = renderComponent(<StallNotice state="slow" />);

    // role="status" (polite), never role="alert" — the Transfer isn't failing.
    await screen.find({ role: "status" }).shouldHaveText("Slow connection…");
  });

  test("softens the copy for a Transfer that's almost done", async () => {
    const screen = renderComponent(<StallNotice state="almost" />);

    await screen.find({ role: "status" }).shouldHaveText("Almost done…");
  });
});
