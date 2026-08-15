import { suite, test } from "~test/kit";
import { renderComponent } from "~test/kit/component";
import { RoomStream } from "~/features/room/components/RoomStream";
import type { TransferLogRow } from "~/features/room/utils/transfer-log";

function row(over: Partial<TransferLogRow> = {}): TransferLogRow {
  return {
    id: "m1",
    kind: "snippet",
    name: "hi",
    content: "hi",
    status: "delivered",
    author: { role: "SENDER" },
    mine: false,
    receivedAt: 0,
    ...over,
  };
}

suite("RoomStream", () => {
  test("teaches the surface while the stream is empty", async () => {
    const screen = renderComponent(<RoomStream rows={[]} />);
    await screen
      .find({ text: "No messages yet. Send text, a link, or a file to start." })
      .shouldBeVisible();
  });

  test("renders every row as a message", async () => {
    const screen = renderComponent(
      <RoomStream
        rows={[
          row({ id: "a", name: "first", content: "first" }),
          row({ id: "b", name: "second", content: "second", mine: true }),
        ]}
      />,
    );
    await screen.find({ text: "first" }).shouldBeVisible();
    await screen.find({ text: "second" }).shouldBeVisible();
  });

  test("heads a day's messages with a divider", async () => {
    const screen = renderComponent(
      <RoomStream rows={[row({ id: "a", name: "hi", content: "hi", receivedAt: Date.now() })]} />,
    );
    await screen.find({ text: "Today" }).shouldBeVisible();
  });
});
