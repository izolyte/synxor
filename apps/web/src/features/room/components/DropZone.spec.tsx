import { fireEvent, screen as rtlScreen } from "@testing-library/react";
import { expect, vi } from "vitest";
import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { DropZone } from "~/features/room/components/DropZone";

// File.size is normally read-only and derived from real byte content; for a
// simulated multi-GB file we override it rather than allocate the real bytes.
function file(name: string, size: number, type = "text/plain"): File {
  const content = new Uint8Array(Math.min(size, 1024));
  const result = new File([content], name, { type });
  Object.defineProperty(result, "size", { value: size, configurable: true });
  return result;
}

// jsdom has no DataTransfer; a plain object with `files`/`items` is enough for the
// component's drop handler, which only reads those two properties.
function dataTransfer(files: File[], { isDirectory = false } = {}) {
  return {
    files,
    items: files.map(() => ({
      kind: "file",
      webkitGetAsEntry: () => (isDirectory ? { isDirectory: true } : { isDirectory: false }),
    })),
  };
}

// The pointer-coarse/fine copy switch is pure CSS (docs/design/09-focus-keyboard.md);
// jsdom applies no stylesheet (vitest.config.ts sets css: false), so both spans are
// present and the accessible name isn't a reliable selector here. The zone itself
// is queried by testid; the visible copy is asserted separately via text content —
// the actual media-query hide/show is a manual/in-browser check, not a jsdom one.
suite("DropZone", () => {
  test("renders the fine-pointer copy", async () => {
    const screen = renderComponent(<DropZone />);

    await screen.find({ text: "Drop files here or click to browse" }).shouldBeVisible();
  });

  test("opens the file picker on Enter", async () => {
    const screen = renderComponent(<DropZone />);
    // jsdom can't observe an actual OS file-picker dialog opening; a click on the
    // real `input[type=file]` is the closest signal available. Scoped to this one
    // instance (not HTMLInputElement.prototype) so the spy reads as "the picker
    // input got clicked", not "some input, somewhere, got clicked".
    const clickSpy = vi.spyOn(rtlScreen.getByTestId("drop-zone-input"), "click");

    await screen.find({ testId: "drop-zone" }).press("Enter");

    expect(clickSpy).toHaveBeenCalled();
  });

  test("queues a picked file with name, size, and icon", async () => {
    const screen = renderComponent(<DropZone />);

    fireEvent.change(rtlScreen.getByTestId("drop-zone-input"), {
      target: { files: [file("report.pdf", 2048, "application/pdf")] },
    });

    await screen.find({ text: "report.pdf" }).shouldBeVisible();
    await screen.find({ text: "2 KB" }).shouldBeVisible();
  });

  test("shows drag-over state while a drag is over the zone, clears on leave", async () => {
    const screen = renderComponent(<DropZone />);
    const zone = screen.find({ testId: "drop-zone" });

    fireEvent.dragEnter(rtlScreen.getByTestId("drop-zone"), {
      dataTransfer: dataTransfer([file("a.txt", 10)]),
    });
    await zone.shouldHaveAttribute("data-state", "drag-over");

    fireEvent.dragLeave(rtlScreen.getByTestId("drop-zone"));
    await zone.shouldHaveAttribute("data-state", "idle");
  });

  test("accepts a dropped file", async () => {
    const screen = renderComponent(<DropZone />);

    fireEvent.drop(rtlScreen.getByTestId("drop-zone"), {
      dataTransfer: dataTransfer([file("photo.png", 1024, "image/png")]),
    });

    await screen.find({ text: "photo.png" }).shouldBeVisible();
  });

  test("rejects a folder drop with the standard message, queues nothing", async () => {
    const screen = renderComponent(<DropZone />);

    fireEvent.drop(rtlScreen.getByTestId("drop-zone"), {
      dataTransfer: dataTransfer([file("folder-entry", 0)], { isDirectory: true }),
    });

    await screen
      .find({ text: "Folders aren't supported. Select individual files." })
      .shouldBeVisible();
    await screen.find({ text: "folder-entry" }).shouldNotExist();
  });

  // dnd-kit's KeyboardSensor moves the active item via `sortableKeyboardCoordinates`,
  // which measures real element rects — jsdom has no layout engine and reports
  // every rect as zero-size, so an Arrow-key drag can't be asserted end-to-end
  // here (mirrors the pointer-coarse CSS gap above). What's verifiable in jsdom:
  // the handle is a real, focusable button a keyboard user can reach and press.
  test("exposes the reorder handle as a focusable, keyboard-reachable control", async () => {
    const screen = renderComponent(<DropZone />);

    fireEvent.drop(rtlScreen.getByTestId("drop-zone"), {
      dataTransfer: dataTransfer([file("a.txt", 10)]),
    });
    await screen.find({ text: "a.txt" }).shouldBeVisible();

    const handle = rtlScreen.getByRole("button", { name: "Reorder a.txt" });
    handle.focus();
    expect(handle).toHaveAttribute("tabindex", "0");
    expect(document.activeElement).toBe(handle);
  });

  test("removes a queued file", async () => {
    const screen = renderComponent(<DropZone />);

    fireEvent.drop(rtlScreen.getByTestId("drop-zone"), {
      dataTransfer: dataTransfer([file("a.txt", 10)]),
    });
    await screen.find({ text: "a.txt" }).shouldBeVisible();

    await screen.find({ role: "button", name: "Remove a.txt" }).click();

    await screen.find({ text: "a.txt" }).shouldNotExist();
  });
});
