import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { useFileQueue } from "~/features/room/hooks/useFileQueue";
import { MAX_FILE_SIZE_BYTES } from "~/features/room/constants/file-queue";

// File.size is normally read-only and derived from real byte content; for a
// simulated multi-GB file we override it rather than allocate the real bytes.
function file(name: string, size: number, type = "text/plain"): File {
  const content = new Uint8Array(Math.min(size, 1024));
  const result = new File([content], name, { type, lastModified: 1 });
  Object.defineProperty(result, "size", { value: size, configurable: true });
  return result;
}

// Harness drives the hook through real events so state updates land inside
// userEvent's act(), same pattern as useClipboard.spec.tsx.
function Harness({ initial = [] }: { initial?: File[] }) {
  const { files, notice, addFiles, rejectFolder, removeFile, reorderFiles } = useFileQueue();
  return (
    <>
      <button onClick={() => addFiles(initial)}>add</button>
      <button onClick={() => addFiles(initial)}>add-again</button>
      <button onClick={rejectFolder}>drop-folder</button>
      <button onClick={() => reorderFiles(files[1]?.id, files[0]?.id)}>move-second-to-first</button>
      <output data-testid="notice">{notice?.message ?? ""}</output>
      <output data-testid="order">{files.map((queued) => queued.file.name).join(",")}</output>
      <ul>
        {files.map((queued) => (
          <li key={queued.id}>
            {queued.file.name} — {queued.warning ?? "ok"}
            <button onClick={() => removeFile(queued.id)}>{`remove ${queued.file.name}`}</button>
          </li>
        ))}
      </ul>
    </>
  );
}

suite("useFileQueue", () => {
  test("queues a file on add", async () => {
    const screen = renderComponent(<Harness initial={[file("a.txt", 10)]} />);

    await screen.find({ role: "button", name: "add" }).click();

    await screen.find({ text: "a.txt — ok" }).shouldBeVisible();
  });

  test("marks a zero-byte file as empty without blocking it", async () => {
    const screen = renderComponent(<Harness initial={[file("empty.txt", 0)]} />);

    await screen.find({ role: "button", name: "add" }).click();

    await screen.find({ text: "empty.txt — This file is empty." }).shouldBeVisible();
  });

  test("rejects a duplicate (same name+size+lastModified) without re-queueing", async () => {
    const screen = renderComponent(<Harness initial={[file("a.txt", 10)]} />);

    await screen.find({ role: "button", name: "add" }).click();
    await screen.find({ role: "button", name: "add-again" }).click();

    await screen.find({ testId: "notice" }).shouldHaveText("This file is already queued.");
  });

  test("rejects a file over the size limit", async () => {
    const screen = renderComponent(
      <Harness initial={[file("huge.bin", MAX_FILE_SIZE_BYTES + 1)]} />,
    );

    await screen.find({ role: "button", name: "add" }).click();

    await screen
      .find({ testId: "notice" })
      .shouldHaveText("huge.bin exceeds the 5 GB size limit.");
  });

  test("silently drops OS artefacts like .DS_Store", async () => {
    const screen = renderComponent(<Harness initial={[file(".DS_Store", 10)]} />);

    await screen.find({ role: "button", name: "add" }).click();

    await screen.find({ testId: "notice" }).shouldHaveText("");
  });

  test("surfaces a folder drop as an error, no file queued", async () => {
    const screen = renderComponent(<Harness />);

    await screen.find({ role: "button", name: "drop-folder" }).click();

    await screen
      .find({ testId: "notice" })
      .shouldHaveText("Folders aren't supported. Select individual files.");
  });

  test("removes a queued file", async () => {
    const screen = renderComponent(<Harness initial={[file("a.txt", 10)]} />);

    await screen.find({ role: "button", name: "add" }).click();
    await screen.find({ role: "button", name: "remove a.txt" }).click();

    await screen.find({ text: "a.txt — ok" }).shouldNotExist();
  });

  test("reorders the queue", async () => {
    const screen = renderComponent(
      <Harness initial={[file("a.txt", 10), file("b.txt", 10)]} />,
    );

    await screen.find({ role: "button", name: "add" }).click();
    await screen.find({ testId: "order" }).shouldHaveText("a.txt,b.txt");

    await screen.find({ role: "button", name: "move-second-to-first" }).click();

    await screen.find({ testId: "order" }).shouldHaveText("b.txt,a.txt");
  });
});
