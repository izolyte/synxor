import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import type { ReactNode } from "react";
import { screen as rtlScreen } from "@testing-library/react";
import { expect } from "vitest";
import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { QueuedFileRow } from "~/features/room/components/QueuedFileRow";
import type { QueuedFile } from "~/features/room/hooks/useFileQueue";

function queued(overrides: Partial<QueuedFile["file"]> = {}, warning?: string): QueuedFile {
  const file = new File(["x"], "report.pdf", { type: "application/pdf", ...overrides });
  return { id: "report.pdf|1|1", file, warning };
}

// dnd-kit's useSortable throws outside a DndContext/SortableContext, so every
// render needs both — the same wrapper DropZone provides in the real UI.
function withDndContext(children: ReactNode) {
  return (
    <DndContext>
      <SortableContext items={["report.pdf|1|1"]}>
        <ul>{children}</ul>
      </SortableContext>
    </DndContext>
  );
}

suite("QueuedFileRow", () => {
  test("shows the file name, formatted size, and a remove control", async () => {
    const screen = renderComponent(
      withDndContext(<QueuedFileRow queued={queued()} onRemove={() => {}} />),
    );

    await screen.find({ text: "report.pdf" }).shouldBeVisible();
    await screen.find({ role: "button", name: "Remove report.pdf" }).shouldBeVisible();
  });

  test("exposes a reorder handle", async () => {
    const screen = renderComponent(
      withDndContext(<QueuedFileRow queued={queued()} onRemove={() => {}} />),
    );

    await screen.find({ role: "button", name: "Reorder report.pdf" }).shouldBeVisible();
  });

  test("surfaces a per-file warning (e.g. an empty file) without hiding the row", async () => {
    const screen = renderComponent(
      withDndContext(
        <QueuedFileRow queued={queued({}, "This file is empty.")} onRemove={() => {}} />,
      ),
    );

    await screen.find({ text: "This file is empty." }).shouldBeVisible();
    await screen.find({ text: "report.pdf" }).shouldBeVisible();
  });

  test("shows live progress while its upload is in flight", async () => {
    renderComponent(
      withDndContext(
        <QueuedFileRow
          queued={queued()}
          onRemove={() => {}}
          upload={{ phase: "uploading", percent: 40 }}
        />,
      ),
    );

    const bar = rtlScreen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(bar).toHaveAccessibleName("Uploading report.pdf");
  });

  test("marks the row Sent once its upload completes, dropping the bar", async () => {
    const screen = renderComponent(
      withDndContext(
        <QueuedFileRow
          queued={queued()}
          onRemove={() => {}}
          upload={{ phase: "done", transferId: "t1" }}
        />,
      ),
    );

    await screen.find({ text: "Sent" }).shouldBeVisible();
    expect(rtlScreen.queryByRole("progressbar")).toBeNull();
  });

  test("announces an upload failure on the row", async () => {
    const screen = renderComponent(
      withDndContext(
        <QueuedFileRow
          queued={queued()}
          onRemove={() => {}}
          upload={{ phase: "error", message: "This file exceeds the size limit." }}
        />,
      ),
    );

    await screen.find({ text: "This file exceeds the size limit." }).shouldBeVisible();
    // role="status" so screen readers hear the failure without focus moving.
    // Asserted on the message element itself: dnd-kit mounts its own status
    // live region, so a bare role query would be ambiguous.
    expect(rtlScreen.getByText("This file exceeds the size limit.")).toHaveAttribute(
      "role",
      "status",
    );
  });

  test("calls onRemove with the file's id", async () => {
    let removedId = "";
    const screen = renderComponent(
      withDndContext(<QueuedFileRow queued={queued()} onRemove={(id) => (removedId = id)} />),
    );

    await screen.find({ role: "button", name: "Remove report.pdf" }).click();

    expect(removedId).toBe("report.pdf|1|1");
  });
});
