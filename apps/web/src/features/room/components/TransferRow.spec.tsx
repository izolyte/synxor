import { screen as rtlScreen } from "@testing-library/react";
import { expect, vi } from "vitest";
import { suite, test } from "~test/kit";
import { renderComponent } from "~test/kit/component";
import {
  TransferRow,
  type TransferRowData,
  type TransferStatus,
} from "~/features/room/components/TransferRow";

function transfer(overrides: Partial<TransferRowData> = {}): TransferRowData {
  return {
    id: "t1",
    kind: "file",
    name: "video.mp4",
    status: "delivered",
    sizeBytes: 2048,
    href: "http://api.test/dl",
    ...overrides,
  };
}

function row(data: TransferRowData, onCopy?: (value: string) => void) {
  return (
    <ul>
      <TransferRow transfer={data} onCopy={onCopy} />
    </ul>
  );
}

suite("TransferRow", () => {
  test("shows the name and IEC-formatted size for a file", async () => {
    const screen = renderComponent(row(transfer()));

    await screen.find({ text: "video.mp4" }).shouldBeVisible();
    await screen.find({ text: "2 KB" }).shouldBeVisible();
  });

  test("keeps the full name in a title for long, truncated names", () => {
    const name = "quarterly-report-final-final-v3-actually-final.pdf";
    renderComponent(row(transfer({ name })));

    expect(rtlScreen.getByText(name)).toHaveAttribute("title", name);
  });

  const STATUSES: Array<[TransferStatus, string]> = [
    ["queued", "Queued"],
    ["in_progress", "In progress"],
    ["delivered", "Delivered"],
    ["failed", "Failed"],
    ["cancelled", "Cancelled"],
  ];

  for (const [status, label] of STATUSES) {
    test(`labels the ${status} status with text, not color alone`, () => {
      renderComponent(row(transfer({ status })));

      // The label is both visible text and part of the pill's accessible name.
      expect(rtlScreen.getByText(label)).toBeVisible();
      expect(rtlScreen.getByLabelText(`Status: ${label}`)).toBeInTheDocument();
    });
  }

  test("offers a native download for a file", async () => {
    const screen = renderComponent(row(transfer()));

    const link = screen.find({ role: "link", name: "Download video.mp4" });
    await link.shouldHaveAttribute("href", "http://api.test/dl");
    await link.shouldHaveAttribute("download", "video.mp4");
  });

  test("opens a link in a new tab and shows no size column", () => {
    renderComponent(
      row(transfer({ kind: "link", name: "https://example.com", status: "queued", sizeBytes: undefined, href: "https://example.com" })),
    );

    const link = rtlScreen.getByRole("link", { name: "Open https://example.com" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
    // No sizeBytes → the size column is omitted entirely (files-only).
    expect(rtlScreen.queryByText(/^\d+(\.\d+)?\s(B|KB|MB|GB|TB)$/)).not.toBeInTheDocument();
  });

  test("copies a snippet's value through the copy action", async () => {
    const onCopy = vi.fn();
    const screen = renderComponent(
      row(
        transfer({ kind: "snippet", name: "meeting notes", status: "delivered", sizeBytes: undefined, href: undefined, value: "the secret text" }),
        onCopy,
      ),
    );

    await screen.find({ role: "button", name: "Copy meeting notes" }).click();

    expect(onCopy).toHaveBeenCalledWith("the secret text");
  });
});
