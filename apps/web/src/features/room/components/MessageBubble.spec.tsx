import { expect, vi } from "vitest";
import { suite, test } from "~test/kit";
import { renderComponent } from "~test/kit/component";
import { MessageBubble } from "~/features/room/components/MessageBubble";
import type { TransferLogRow } from "~/features/room/utils/transfer-log";

function row(over: Partial<TransferLogRow> = {}): TransferLogRow {
  return {
    id: "m1",
    kind: "snippet",
    name: "hello",
    content: "hello",
    status: "delivered",
    author: { role: "SENDER" },
    mine: false,
    receivedAt: Date.parse("2026-01-01T10:00:00.000Z"),
    ...over,
  };
}

suite("MessageBubble", () => {
  test("labels an incoming message with its author's role when no identity is known", async () => {
    const onCopy = vi.fn();
    const screen = renderComponent(
      <MessageBubble row={row({ author: { role: "RECEIVER" } })} onCopy={onCopy} />,
    );

    await screen.find({ text: "Receiver" }).shouldBeVisible();
    await screen.find({ text: "hello" }).shouldBeVisible();
    await screen.find({ role: "button", name: "Copy hello" }).click();
    expect(onCopy).toHaveBeenCalledWith("hello");
  });

  test("captions an incoming message with the author's identity name over the bare role", async () => {
    const screen = renderComponent(
      <MessageBubble
        row={row({
          author: {
            role: "RECEIVER",
            identity: { key: "k1", colorKey: "indigo", name: "Indigo Heron" },
          },
        })}
      />,
    );

    await screen.find({ text: "Indigo Heron" }).shouldBeVisible();
    await screen.find({ text: "Receiver" }).shouldNotExist();
  });

  test("marks the sender's own delivered message as Seen and drops the author caption", async () => {
    const screen = renderComponent(<MessageBubble row={row({ mine: true })} />);

    await screen.find({ label: "Status: Delivered" }).shouldBeVisible();
    await screen.find({ text: "Sender" }).shouldNotExist();
  });

  test("renders a Link as an openable, distinct affordance", async () => {
    const url = "https://example.com/x";
    const screen = renderComponent(
      <MessageBubble row={row({ kind: "link", name: url, content: url })} />,
    );

    const link = screen.find({ role: "link", name: `Open ${url}` });
    await link.shouldHaveAttribute("href", url);
    await link.shouldHaveAttribute("target", "_blank");
  });

  test("renders a file with a download link when a href is present", async () => {
    const screen = renderComponent(
      <MessageBubble
        row={row({ kind: "file", name: "report.pdf", content: undefined, href: "http://api.test/dl/m1" })}
      />,
    );

    await screen
      .find({ role: "link", name: "Download report.pdf" })
      .shouldHaveAttribute("href", "http://api.test/dl/m1");
  });

  test("shows a receiving hint for a file still in flight", async () => {
    const screen = renderComponent(
      <MessageBubble
        row={row({ kind: "file", name: "big.zip", content: undefined, status: "in_progress" })}
      />,
    );
    await screen.find({ text: "Receiving…" }).shouldBeVisible();
  });
});
