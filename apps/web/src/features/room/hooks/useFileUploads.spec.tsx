import { useMemo, useState } from "react";
import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { useFileUploads, type UploadState } from "~/features/room/hooks/useFileUploads";
import type { QueuedFile } from "~/features/room/hooks/useFileQueue";
import { UploadError, type UploadFileOptions } from "~/features/room/services/chunk-upload.service";

function queued(name: string): QueuedFile {
  return { id: name, file: new File([new Uint8Array(4)], name, { type: "text/plain" }) };
}

interface PendingUpload {
  options: UploadFileOptions;
  resolve: (transferId: string) => void;
  reject: (err: unknown) => void;
}

// Controlled uploader: each call parks until a Harness button settles it, so
// tests drive the sequential pipeline step by step.
class FakeUploader {
  readonly calls: PendingUpload[] = [];
  readonly fn = (options: UploadFileOptions) =>
    new Promise<{ transferId: string; receivedChunks: number; totalChunks: number; complete: boolean }>(
      (resolve, reject) => {
        // Like real fetch: aborting the signal rejects the in-flight promise.
        options.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
        this.calls.push({
          options,
          resolve: (transferId) =>
            resolve({ transferId, receivedChunks: 1, totalChunks: 1, complete: true }),
          reject,
        });
      },
    );
}

function describeState(state: UploadState | undefined): string {
  if (!state) return "none";
  if (state.phase === "uploading") return `uploading:${state.percent}`;
  if (state.phase === "done") return `done:${state.transferId}`;
  return `error:${state.message}`;
}

function Harness({ uploader, initial }: { uploader: FakeUploader; initial: QueuedFile[] }) {
  const [files, setFiles] = useState<QueuedFile[]>(initial);
  const uploaderFn = useMemo(() => uploader.fn, [uploader]);
  const states = useFileUploads(files, "tok", "http://api.test", uploaderFn);
  return (
    <>
      {initial.map((f) => (
        <output key={f.id} data-testid={f.id}>
          {describeState(states.get(f.id))}
        </output>
      ))}
      <button onClick={() => uploader.calls.at(-1)?.options.onProgress?.(50)}>progress</button>
      <button onClick={() => uploader.calls.at(-1)?.resolve(`t${uploader.calls.length}`)}>
        finish
      </button>
      <button onClick={() => uploader.calls.at(-1)?.reject(new UploadError("Upload failed.", 500))}>
        fail
      </button>
      <button onClick={() => setFiles((current) => current.slice(1))}>remove-first</button>
    </>
  );
}

suite("useFileUploads", () => {
  test("uploads queued files one at a time, in order", async () => {
    const uploader = new FakeUploader();
    const screen = renderComponent(
      <Harness uploader={uploader} initial={[queued("a.txt"), queued("b.txt")]} />,
    );

    await screen.find({ testId: "a.txt" }).shouldHaveText("uploading:0");
    await screen.find({ testId: "b.txt" }).shouldHaveText("none");

    await screen.find({ role: "button", name: "finish" }).click();
    await screen.find({ testId: "a.txt" }).shouldHaveText("done:t1");
    await screen.find({ testId: "b.txt" }).shouldHaveText("uploading:0");

    await screen.find({ role: "button", name: "finish" }).click();
    await screen.find({ testId: "b.txt" }).shouldHaveText("done:t2");
  });

  test("reports per-chunk progress", async () => {
    const uploader = new FakeUploader();
    const screen = renderComponent(<Harness uploader={uploader} initial={[queued("a.txt")]} />);

    await screen.find({ role: "button", name: "progress" }).click();
    await screen.find({ testId: "a.txt" }).shouldHaveText("uploading:50");
  });

  test("surfaces an upload failure on the row and moves on to the next file", async () => {
    const uploader = new FakeUploader();
    const screen = renderComponent(
      <Harness uploader={uploader} initial={[queued("a.txt"), queued("b.txt")]} />,
    );

    await screen.find({ role: "button", name: "fail" }).click();
    await screen.find({ testId: "a.txt" }).shouldHaveText("error:Upload failed.");
    await screen.find({ testId: "b.txt" }).shouldHaveText("uploading:0");
  });

  test("aborts and clears state when a mid-upload row is removed", async () => {
    const uploader = new FakeUploader();
    const screen = renderComponent(
      <Harness uploader={uploader} initial={[queued("a.txt"), queued("b.txt")]} />,
    );
    await screen.find({ testId: "a.txt" }).shouldHaveText("uploading:0");

    await screen.find({ role: "button", name: "remove-first" }).click();

    await screen.find({ testId: "a.txt" }).shouldHaveText("none");
    await screen.find({ testId: "b.txt" }).shouldHaveText("uploading:0");
  });
});
