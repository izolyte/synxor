import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { IncomingTransfers } from "~/features/room/components/IncomingTransfers";
import type {
  TransferProgressPayload,
  TransferTextPayload,
} from "~/features/room/constants/transfer";

const EMPTY_COPY = "Files, text, and links the Sender shares will appear here.";

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

function snippet(id: string, content: string): TransferTextPayload {
  return { transferId: id, payloadType: "TEXT_SNIPPET", content };
}

function feed(props: {
  transfers?: TransferProgressPayload[];
  texts?: TransferTextPayload[];
  token?: string;
  apiOrigin?: string;
  delivered?: ReadonlySet<string>;
}) {
  return (
    <IncomingTransfers
      transfers={props.transfers ?? []}
      texts={props.texts ?? []}
      token={props.token}
      apiOrigin={props.apiOrigin}
      delivered={props.delivered ?? new Set()}
    />
  );
}

suite("IncomingTransfers", () => {
  test("teaches the surface while nothing has arrived", async () => {
    const screen = renderComponent(feed({ token: "tok", apiOrigin: "http://api.test" }));

    await screen.find({ text: EMPTY_COPY }).shouldBeVisible();
  });

  test("renders one row per live transfer, with its download link", async () => {
    const screen = renderComponent(
      feed({
        transfers: [transfer("t1", "a.txt"), transfer("t2", "b.txt")],
        token: "tok",
        apiOrigin: "http://api.test",
      }),
    );

    await screen.find({ text: "a.txt" }).shouldBeVisible();
    await screen.find({ text: "b.txt" }).shouldBeVisible();
    await screen.find({ text: EMPTY_COPY }).shouldNotExist();
  });

  test("builds authenticated download URLs from the origin, id, and token", async () => {
    const screen = renderComponent(
      feed({ transfers: [transfer("t1", "a.txt")], token: "tok", apiOrigin: "http://api.test" }),
    );

    await screen
      .find({ role: "link", name: "Download" })
      .shouldHaveAttribute("href", "http://api.test/transfer/t1/download?token=tok");
  });

  test("shows a Delivered row, not a Download link, once this Receiver has pulled it", async () => {
    const screen = renderComponent(
      feed({
        transfers: [transfer("t1", "a.txt")],
        token: "tok",
        apiOrigin: "http://api.test",
        delivered: new Set(["t1"]),
      }),
    );

    await screen.find({ text: "Delivered" }).shouldBeVisible();
    await screen.find({ role: "link", name: "Download" }).shouldNotExist();
  });

  test("renders text rows even before a download token is available", async () => {
    const screen = renderComponent(feed({ texts: [snippet("x1", "hello there")] }));

    await screen.find({ text: "hello there" }).shouldBeVisible();
    await screen.find({ text: EMPTY_COPY }).shouldNotExist();
  });

  test("keeps file rows hidden without a token — no broken links", async () => {
    const screen = renderComponent(
      feed({ transfers: [transfer("t1", "a.txt")], apiOrigin: "http://api.test" }),
    );

    await screen.find({ text: EMPTY_COPY }).shouldBeVisible();
    await screen.find({ text: "a.txt" }).shouldNotExist();
  });

  test("keeps file rows hidden without an API origin", async () => {
    const screen = renderComponent(feed({ transfers: [transfer("t1", "a.txt")], token: "tok" }));

    await screen.find({ text: EMPTY_COPY }).shouldBeVisible();
    await screen.find({ text: "a.txt" }).shouldNotExist();
  });
});
