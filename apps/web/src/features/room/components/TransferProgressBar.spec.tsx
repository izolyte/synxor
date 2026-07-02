import { screen as rtlScreen } from "@testing-library/react";
import { expect } from "vitest";
import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { TransferProgressBar } from "~/features/room/components/TransferProgressBar";

// "progressbar" isn't in the kit's Role vocabulary (no spec drives one), so this
// suite queries it via raw RTL — same escape hatch DropZone.spec uses for
// input[type=file].
function bar() {
  return rtlScreen.getByRole("progressbar");
}

suite("TransferProgressBar", () => {
  test("exposes the value and range to assistive tech", () => {
    renderComponent(<TransferProgressBar percent={40} label="Uploading video.mp4" />);

    expect(bar()).toHaveAttribute("aria-valuenow", "40");
    expect(bar()).toHaveAttribute("aria-valuemin", "0");
    expect(bar()).toHaveAttribute("aria-valuemax", "100");
  });

  test("takes its accessible name from the label", () => {
    renderComponent(<TransferProgressBar percent={40} label="Uploading video.mp4" />);

    expect(bar()).toHaveAccessibleName("Uploading video.mp4");
  });

  test("clamps a negative percent to 0", () => {
    renderComponent(<TransferProgressBar percent={-20} label="Uploading a" />);

    expect(bar()).toHaveAttribute("aria-valuenow", "0");
  });

  test("clamps an overshooting percent to 100", () => {
    renderComponent(<TransferProgressBar percent={250} label="Uploading a" />);

    expect(bar()).toHaveAttribute("aria-valuenow", "100");
  });

  test("renders the 4px compact track when asked", () => {
    renderComponent(<TransferProgressBar percent={40} label="Uploading a" compact />);

    expect(bar().className).toContain("h-1");
    expect(bar().className).not.toContain("h-1.5");
  });

  test("renders the 6px default track otherwise", () => {
    renderComponent(<TransferProgressBar percent={40} label="Uploading a" />);

    expect(bar().className).toContain("h-1.5");
  });
});
