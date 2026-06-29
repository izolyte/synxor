import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { CopyButton } from "~/features/room/components/CopyButton";

suite("CopyButton", () => {
  test("copies the value and confirms inline", async () => {
    const screen = renderComponent(
      <CopyButton value="ABC123" label="Copy code" copiedLabel="Copied" errorLabel="failed" />,
    );

    // userEvent.setup() backs navigator.clipboard, so writeText resolves.
    await screen.find({ role: "button", name: "Copy code" }).click();

    await screen.find({ text: "Copied" }).shouldBeVisible();
  });

  test("shows the fallback when the clipboard rejects", async () => {
    const screen = renderComponent(
      <CopyButton
        value="ABC123"
        label="Copy code"
        copiedLabel="Copied"
        errorLabel="Couldn't copy"
      />,
    );
    const original = navigator.clipboard.writeText;
    navigator.clipboard.writeText = () => Promise.reject(new Error("denied"));

    try {
      await screen.find({ role: "button", name: "Copy code" }).click();
      await screen.find({ text: "Couldn't copy" }).shouldBeVisible();
    } finally {
      navigator.clipboard.writeText = original;
    }
  });
});
