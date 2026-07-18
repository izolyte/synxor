import { screen as rtlScreen } from "@testing-library/react";
import { expect, vi } from "vitest";
import { suite, test } from "~test/kit";
import { renderComponent } from "~test/kit/component";
import { IncomingTextRow } from "~/features/room/components/IncomingTextRow";
import type { TransferTextPayload } from "~/features/room/constants/transfer";

function row(payload: TransferTextPayload) {
  return (
    <ul>
      <IncomingTextRow payload={payload} />
    </ul>
  );
}

suite("IncomingTextRow", () => {
  test("opens a Link in a new tab", async () => {
    const screen = renderComponent(
      row({ transferId: "l1", payloadType: "LINK", content: "https://example.com" }),
    );

    const link = screen.find({ role: "link", name: "Open https://example.com" });
    await link.shouldHaveAttribute("href", "https://example.com");
    await link.shouldHaveAttribute("target", "_blank");
    await link.shouldHaveAttribute("rel", "noreferrer");
  });

  test("copies a Snippet to the clipboard", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    const screen = renderComponent(
      row({ transferId: "s1", payloadType: "TEXT_SNIPPET", content: "secret note" }),
    );

    await screen.find({ role: "button", name: "Copy snippet" }).click();

    expect(writeText).toHaveBeenCalledWith("secret note");
  });

  test("shows a manual-copy fallback when the clipboard write fails", async () => {
    const screen = renderComponent(
      row({ transferId: "s2", payloadType: "TEXT_SNIPPET", content: "note" }),
    );
    const original = navigator.clipboard.writeText;
    navigator.clipboard.writeText = () => Promise.reject(new Error("denied"));

    try {
      await screen.find({ role: "button", name: "Copy snippet" }).click();
      expect(await rtlScreen.findByText(/copy it manually/i)).toBeVisible();
    } finally {
      navigator.clipboard.writeText = original;
    }
  });
});
