import { fireEvent, screen as rtlScreen } from "@testing-library/react";
import { expect } from "vitest";
import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { useNativeFileDrop } from "~/features/room/hooks/useNativeFileDrop";

function dataTransfer(files: File[], { isDirectory = false } = {}) {
  return {
    types: ["Files"],
    files,
    items: files.map(() => ({
      kind: "file",
      webkitGetAsEntry: () => (isDirectory ? { isDirectory: true } : { isDirectory: false }),
    })),
  };
}

function Harness({
  onFiles,
  onFolderRejected,
}: {
  onFiles: (f: File[]) => void;
  onFolderRejected: () => void;
}) {
  const { dragActive, handlers } = useNativeFileDrop({ onFiles, onFolderRejected });
  return <div data-testid="target" data-state={dragActive ? "drag-over" : "idle"} {...handlers} />;
}

suite("useNativeFileDrop", () => {
  test("marks drag-active on enter, clears on leave", async () => {
    const screen = renderComponent(<Harness onFiles={() => {}} onFolderRejected={() => {}} />);
    const target = rtlScreen.getByTestId("target");

    fireEvent.dragEnter(target, { dataTransfer: dataTransfer([]) });
    await screen.find({ testId: "target" }).shouldHaveAttribute("data-state", "drag-over");

    fireEvent.dragLeave(target);
    await screen.find({ testId: "target" }).shouldHaveAttribute("data-state", "idle");
  });

  test("does not clear drag-active until every nested dragleave balances its dragenter", async () => {
    const screen = renderComponent(<Harness onFiles={() => {}} onFolderRejected={() => {}} />);
    const target = rtlScreen.getByTestId("target");

    fireEvent.dragEnter(target, { dataTransfer: dataTransfer([]) }); // outer
    fireEvent.dragEnter(target, { dataTransfer: dataTransfer([]) }); // into a child
    fireEvent.dragLeave(target); // leaving the child
    await screen.find({ testId: "target" }).shouldHaveAttribute("data-state", "drag-over");

    fireEvent.dragLeave(target); // leaving the outer zone
    await screen.find({ testId: "target" }).shouldHaveAttribute("data-state", "idle");
  });

  test("reports dropped files", async () => {
    const files: File[] = [];
    renderComponent(<Harness onFiles={(f) => files.push(...f)} onFolderRejected={() => {}} />);
    const dropped = new File(["x"], "a.txt");

    fireEvent.drop(rtlScreen.getByTestId("target"), { dataTransfer: dataTransfer([dropped]) });

    expect(files).toEqual([dropped]);
  });

  test("reports a folder drop instead of files", async () => {
    let rejected = false;
    const onFiles = () => {
      throw new Error("should not be called for a folder drop");
    };
    renderComponent(<Harness onFiles={onFiles} onFolderRejected={() => (rejected = true)} />);

    fireEvent.drop(rtlScreen.getByTestId("target"), {
      dataTransfer: dataTransfer([new File(["x"], "folder-entry")], { isDirectory: true }),
    });

    expect(rejected).toBe(true);
  });
});
