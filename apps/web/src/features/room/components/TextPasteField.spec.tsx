import { screen as rtlScreen } from "@testing-library/react";
import { expect, vi } from "vitest";
import { suite, test } from "~test/kit";
import { renderComponent } from "~test/kit/component";
import { TextPasteField } from "~/features/room/components/TextPasteField";
import { MAX_TEXT_PAYLOAD_CHARS } from "~/features/room/constants/transfer";

suite("TextPasteField", () => {
  test("sends the text and clears the field", async () => {
    const onSend = vi.fn();
    const screen = renderComponent(<TextPasteField onSend={onSend} />);

    await screen.find({ role: "textbox", name: "Text or link to send" }).type("https://example.com");
    await screen.find({ role: "button", name: "Send" }).click();

    expect(onSend).toHaveBeenCalledWith("https://example.com");
    expect(rtlScreen.getByRole("textbox", { name: "Text or link to send" })).toHaveValue("");
  });

  test("opens pre-filled from initialText and sends it", async () => {
    const onSend = vi.fn();
    const screen = renderComponent(
      <TextPasteField onSend={onSend} initialText={"shared link\nhttps://example.com"} />,
    );

    expect(rtlScreen.getByRole("textbox", { name: "Text or link to send" })).toHaveValue(
      "shared link\nhttps://example.com",
    );
    await screen.find({ role: "button", name: "Send" }).click();
    expect(onSend).toHaveBeenCalledWith("shared link\nhttps://example.com");
  });

  test("Enter sends and clears the field", async () => {
    const onSend = vi.fn();
    const screen = renderComponent(<TextPasteField onSend={onSend} />);

    const field = screen.find({ role: "textbox", name: "Text or link to send" });
    await field.type("ship it{Enter}");

    expect(onSend).toHaveBeenCalledWith("ship it");
    expect(rtlScreen.getByRole("textbox", { name: "Text or link to send" })).toHaveValue("");
  });

  test("Shift+Enter inserts a newline instead of sending", async () => {
    const onSend = vi.fn();
    const screen = renderComponent(<TextPasteField onSend={onSend} />);

    const field = screen.find({ role: "textbox", name: "Text or link to send" });
    await field.type("line one{Shift>}{Enter}{/Shift}line two");

    expect(onSend).not.toHaveBeenCalled();
    expect(rtlScreen.getByRole("textbox", { name: "Text or link to send" })).toHaveValue(
      "line one\nline two",
    );
  });

  test("disables Send while the field is empty or blank", () => {
    renderComponent(<TextPasteField onSend={vi.fn()} />);
    expect(rtlScreen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  test("rejects input over the character limit with an inline error", async () => {
    const onSend = vi.fn();
    renderComponent(<TextPasteField onSend={onSend} />);

    const field = rtlScreen.getByRole("textbox", { name: "Text or link to send" });
    // fireEvent-level change: typing 100k+ chars char-by-char would be far too slow.
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(field, { target: { value: "a".repeat(MAX_TEXT_PAYLOAD_CHARS + 1) } });

    expect(rtlScreen.getByRole("alert")).toHaveTextContent(/character limit/);
    expect(rtlScreen.getByRole("button", { name: "Send" })).toBeDisabled();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(onSend).not.toHaveBeenCalled();
  });
});
