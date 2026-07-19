import { screen as rtlScreen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, vi } from "vitest";
import { suite, test } from "~test/kit";
import { renderComponent } from "~test/kit/component";
import { TransferLog } from "~/features/room/components/TransferLog";
import type { TransferLogRow } from "~/features/room/utils/transfer-log";

function fileRow(over: Partial<TransferLogRow> = {}): TransferLogRow {
  return {
    id: "r1",
    kind: "file",
    name: "report.pdf",
    status: "delivered",
    sizeBytes: 1024,
    receivedAt: Date.parse("2026-01-01T10:00:00.000Z"),
    ...over,
  };
}

function manyRows(count: number): TransferLogRow[] {
  return Array.from({ length: count }, (_, i) =>
    fileRow({ id: `r${i}`, name: `file-${i}.bin`, receivedAt: 1000 + i }),
  );
}

function activeIndex(): string | null {
  return document.activeElement?.getAttribute("data-index") ?? null;
}

suite("TransferLog", () => {
  test("shows the empty state when there are no Transfers", () => {
    renderComponent(<TransferLog rows={[]} />);
    expect(rtlScreen.getByText("Completed Transfers appear here after Delivery.")).toBeVisible();
  });

  test("renders a row per Transfer with a machine-readable timestamp", () => {
    renderComponent(<TransferLog rows={[fileRow()]} />);
    expect(rtlScreen.getByText("report.pdf")).toBeVisible();
    const time = document.querySelector("time");
    expect(time).toHaveAttribute("dateTime", "2026-01-01T10:00:00.000Z");
  });

  test("arrow keys move roving focus down and up the list", async () => {
    const user = userEvent.setup();
    renderComponent(<TransferLog rows={manyRows(3)} />);

    const first = document.querySelector<HTMLElement>('[data-index="0"]')!;
    first.focus();
    expect(activeIndex()).toBe("0");

    await user.keyboard("{ArrowDown}");
    expect(activeIndex()).toBe("1");

    await user.keyboard("{ArrowDown}");
    expect(activeIndex()).toBe("2");

    // Clamped at the end, then walks back up.
    await user.keyboard("{ArrowDown}");
    expect(activeIndex()).toBe("2");

    await user.keyboard("{ArrowUp}");
    expect(activeIndex()).toBe("1");
  });

  test("Home and End jump to the first and last row", async () => {
    const user = userEvent.setup();
    renderComponent(<TransferLog rows={manyRows(5)} />);

    document.querySelector<HTMLElement>('[data-index="0"]')!.focus();
    await user.keyboard("{End}");
    expect(activeIndex()).toBe("4");

    await user.keyboard("{Home}");
    expect(activeIndex()).toBe("0");
  });

  test("only the active row is in the tab order", () => {
    renderComponent(<TransferLog rows={manyRows(3)} />);
    const tabbable = [...document.querySelectorAll("[data-index]")].filter(
      (el) => el.getAttribute("tabindex") === "0",
    );
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0].getAttribute("data-index")).toBe("0");
  });

  test("pressing C on a focused snippet row copies its value", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    renderComponent(
      <TransferLog
        rows={[fileRow({ id: "s1", kind: "snippet", name: "note", value: "secret text" })]}
        onCopy={onCopy}
      />,
    );

    document.querySelector<HTMLElement>('[data-index="0"]')!.focus();
    await user.keyboard("c");
    expect(onCopy).toHaveBeenCalledWith("secret text");
  });

  test("virtualizes past the 100-row threshold, windowing the rows", () => {
    renderComponent(<TransferLog rows={manyRows(150)} />);
    // The spacer <ul> sizes to the full list (150 × 48px) while only a window of
    // rows is in the DOM — the signature of an active virtualizer.
    const list = document.querySelector<HTMLElement>('ul[role="list"]')!;
    expect(list.style.height).toBe(`${150 * 48}px`);
    expect(document.querySelectorAll("[data-index]").length).toBeLessThan(150);
  });

  test("renders every row, unwindowed, when under the threshold", () => {
    renderComponent(<TransferLog rows={manyRows(20)} />);
    const list = document.querySelector<HTMLElement>('ul[role="list"]')!;
    expect(list.style.height).toBe("");
    expect(document.querySelectorAll("[data-index]")).toHaveLength(20);
  });
});
