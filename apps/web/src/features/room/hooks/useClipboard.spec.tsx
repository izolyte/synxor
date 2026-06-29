import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { useClipboard } from "~/features/room/hooks/useClipboard";

// Drive the hook through a minimal harness so state updates run inside userEvent's
// act() — a bare renderHook would update outside act and never reflect.
function Harness() {
  const { status, copy } = useClipboard();
  return (
    <>
      <button onClick={() => copy("ABC123")}>copy</button>
      <output>{status}</output>
    </>
  );
}

// Swap navigator.clipboard for a case and restore it after, so cases don't bleed.
function setClipboard(value: unknown): () => void {
  const original = Object.getOwnPropertyDescriptor(globalThis.navigator, "clipboard");
  Object.defineProperty(navigator, "clipboard", { configurable: true, value });
  return () => {
    if (original) Object.defineProperty(navigator, "clipboard", original);
    else Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, "clipboard");
  };
}

suite("useClipboard", () => {
  test("reports copied after a successful write", async () => {
    // userEvent.setup() (inside renderComponent) backs navigator.clipboard.
    const screen = renderComponent(<Harness />);

    await screen.find({ role: "button", name: "copy" }).click();

    await screen.find({ text: "copied" }).shouldBeVisible();
  });

  test("reports error when no clipboard is available", async () => {
    const screen = renderComponent(<Harness />);
    const restore = setClipboard(undefined);
    try {
      await screen.find({ role: "button", name: "copy" }).click();
      await screen.find({ text: "error" }).shouldBeVisible();
    } finally {
      restore();
    }
  });

  test("reports error when the write is rejected", async () => {
    const screen = renderComponent(<Harness />);
    const restore = setClipboard({ writeText: () => Promise.reject(new Error("denied")) });
    try {
      await screen.find({ role: "button", name: "copy" }).click();
      await screen.find({ text: "error" }).shouldBeVisible();
    } finally {
      restore();
    }
  });
});
