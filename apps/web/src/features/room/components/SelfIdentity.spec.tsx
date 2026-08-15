import { fireEvent, screen as rtlScreen } from "@testing-library/react";
import { expect, vi } from "vitest";
import { suite, test } from "~test/kit";
import { renderComponent } from "~test/kit/component";
import { SelfIdentity } from "~/features/room/components/SelfIdentity";
import type { ParticipantIdentity } from "~/features/room/constants/transfer";

const self: ParticipantIdentity = { key: "k1", colorKey: "violet", name: "Violet Otter" };

suite("SelfIdentity", () => {
  test("renders nothing until the server assigns an identity", async () => {
    const screen = renderComponent(<SelfIdentity self={undefined} onRename={vi.fn()} />);
    await screen.find({ text: "Violet Otter" }).shouldNotExist();
  });

  test("shows the current identity name", async () => {
    const screen = renderComponent(<SelfIdentity self={self} onRename={vi.fn()} />);
    await screen.find({ text: "Violet Otter" }).shouldBeVisible();
  });

  test("edits the display name and submits it through onRename", async () => {
    const onRename = vi.fn().mockResolvedValue({ identity: { ...self, name: "Alice" } });
    const screen = renderComponent(<SelfIdentity self={self} onRename={onRename} />);

    await screen.find({ role: "button", name: "Edit name" }).click();
    const field = rtlScreen.getByRole("textbox", { name: "Your display name" });
    fireEvent.change(field, { target: { value: "Alice" } });
    await screen.find({ role: "button", name: "Save" }).click();

    expect(onRename).toHaveBeenCalledWith("Alice");
  });
});
