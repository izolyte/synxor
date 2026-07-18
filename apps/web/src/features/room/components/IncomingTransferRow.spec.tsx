import { screen as rtlScreen } from "@testing-library/react";
import { expect } from "vitest";
import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { IncomingTransferRow } from "~/features/room/components/IncomingTransferRow";
import type { TransferProgressPayload } from "~/features/room/constants/transfer";

function transfer(overrides: Partial<TransferProgressPayload> = {}): TransferProgressPayload {
  return {
    transferId: "t1",
    fileName: "video.mp4",
    fileSizeBytes: 2048,
    receivedChunks: 1,
    totalChunks: 4,
    complete: false,
    ...overrides,
  };
}

function row(incoming: TransferProgressPayload, delivered = false) {
  return (
    <ul>
      <IncomingTransferRow
        transfer={incoming}
        downloadHref="http://api.test/dl"
        delivered={delivered}
      />
    </ul>
  );
}

suite("IncomingTransferRow", () => {
  test("shows the file name and formatted size", async () => {
    const screen = renderComponent(row(transfer()));

    await screen.find({ text: "video.mp4" }).shouldBeVisible();
    await screen.find({ text: "2 KB" }).shouldBeVisible();
  });

  test("shows the Sender's live progress while the upload is in flight", () => {
    renderComponent(row(transfer({ receivedChunks: 1, totalChunks: 4 })));

    const bar = rtlScreen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "25");
    expect(bar).toHaveAccessibleName("Receiving video.mp4");
  });

  test("hides the progress bar once the transfer is complete", () => {
    renderComponent(row(transfer({ receivedChunks: 4, totalChunks: 4, complete: true })));

    expect(rtlScreen.queryByRole("progressbar")).toBeNull();
  });

  test("shows 0% instead of NaN when no chunks are counted yet", () => {
    renderComponent(row(transfer({ receivedChunks: 0, totalChunks: 0 })));

    const bar = rtlScreen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "0");
  });

  test("links a native streamed download from the first chunk", async () => {
    const screen = renderComponent(row(transfer()));

    const link = screen.find({ role: "link", name: "Download" });
    await link.shouldHaveAttribute("href", "http://api.test/dl");
    await link.shouldHaveAttribute("download", "video.mp4");
  });

  test("settles into a Delivered state once this Receiver has the file", async () => {
    const screen = renderComponent(row(transfer({ complete: true }), true));

    // The download is done, so the link gives way to a labelled Delivered marker
    // that outlives the Delivery flash — and no lingering progress bar.
    await screen.find({ text: "Delivered" }).shouldBeVisible();
    await screen.find({ role: "link", name: "Download" }).shouldNotExist();
    expect(rtlScreen.getByLabelText("Status: Delivered")).toBeVisible();
    expect(rtlScreen.queryByRole("progressbar")).toBeNull();
  });
});
