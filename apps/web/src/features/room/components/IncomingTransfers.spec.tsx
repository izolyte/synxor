import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { IncomingTransfers } from "~/features/room/components/IncomingTransfers";
import type { TransferProgressPayload } from "~/features/room/constants/transfer";

const EMPTY_COPY = "Files the Sender shares will appear here, ready to download.";

function transfer(id: string, name: string): TransferProgressPayload {
  return {
    transferId: id,
    fileName: name,
    fileSizeBytes: 1024,
    receivedChunks: 1,
    totalChunks: 2,
    complete: false,
  };
}

suite("IncomingTransfers", () => {
  test("teaches the surface while no transfer has arrived", async () => {
    const screen = renderComponent(
      <IncomingTransfers transfers={[]} token="tok" apiOrigin="http://api.test" />,
    );

    await screen.find({ text: EMPTY_COPY }).shouldBeVisible();
  });

  test("renders one row per live transfer, with its download link", async () => {
    const screen = renderComponent(
      <IncomingTransfers
        transfers={[transfer("t1", "a.txt"), transfer("t2", "b.txt")]}
        token="tok"
        apiOrigin="http://api.test"
      />,
    );

    await screen.find({ text: "a.txt" }).shouldBeVisible();
    await screen.find({ text: "b.txt" }).shouldBeVisible();
    await screen.find({ text: EMPTY_COPY }).shouldNotExist();
  });

  test("builds authenticated download URLs from the origin, id, and token", async () => {
    const screen = renderComponent(
      <IncomingTransfers
        transfers={[transfer("t1", "a.txt")]}
        token="tok"
        apiOrigin="http://api.test"
      />,
    );

    await screen
      .find({ role: "link", name: "Download" })
      .shouldHaveAttribute("href", "http://api.test/transfer/t1/download?token=tok");
  });

  test("stays in the empty state without a token — no rows with broken links", async () => {
    const screen = renderComponent(
      <IncomingTransfers
        transfers={[transfer("t1", "a.txt")]}
        token={undefined}
        apiOrigin="http://api.test"
      />,
    );

    await screen.find({ text: EMPTY_COPY }).shouldBeVisible();
    await screen.find({ text: "a.txt" }).shouldNotExist();
  });

  test("stays in the empty state without an API origin", async () => {
    const screen = renderComponent(
      <IncomingTransfers transfers={[transfer("t1", "a.txt")]} token="tok" apiOrigin={undefined} />,
    );

    await screen.find({ text: EMPTY_COPY }).shouldBeVisible();
    await screen.find({ text: "a.txt" }).shouldNotExist();
  });
});
