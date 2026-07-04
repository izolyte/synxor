import { useEffect, useRef, useState } from "react";
import type { QueuedFile } from "~/features/room/hooks/useFileQueue";
import {
  uploadFileInChunks,
  UploadError,
  type UploadFileOptions,
  type ChunkUploadResponse,
} from "~/features/room/services/chunk-upload.service";

export type UploadState =
  | { phase: "uploading"; percent: number }
  | { phase: "done"; transferId: string }
  | { phase: "error"; message: string };

// Test seam; production uses the real chunked uploader.
export type Uploader = (options: UploadFileOptions) => Promise<ChunkUploadResponse>;

/**
 * Auto-uploads queued files one at a time, in queue order. Sequential keeps
 * bandwidth on the file the user dropped first (reordering pending rows still
 * changes what goes next); the server's 10-concurrent limit is per Room across
 * participants, so one lane per tab is also the polite default. Removing a
 * mid-upload row aborts its requests.
 */
export function useFileUploads(
  files: QueuedFile[],
  token: string | undefined,
  apiOrigin: string | undefined,
  uploader: Uploader = uploadFileInChunks,
): Map<string, UploadState> {
  const [states, setStates] = useState<Map<string, UploadState>>(new Map());
  const activeRef = useRef<{ id: string; controller: AbortController } | null>(null);
  const startedRef = useRef<Set<string>>(new Set());

  // React to rows leaving the queue: abort an in-flight upload, and forget the
  // row's "started" mark so re-adding the same file (same id) uploads again.
  useEffect(() => {
    const present = new Set(files.map((queued) => queued.id));

    const active = activeRef.current;
    if (active && !present.has(active.id)) active.controller.abort();

    for (const id of startedRef.current) {
      if (!present.has(id)) startedRef.current.delete(id);
    }
  }, [files]);

  useEffect(() => {
    if (!token || !apiOrigin || activeRef.current) return;
    const next = files.find((queued) => !startedRef.current.has(queued.id));
    if (!next) return;

    startedRef.current.add(next.id);
    const controller = new AbortController();
    activeRef.current = { id: next.id, controller };

    const setState = (state: UploadState) =>
      setStates((current) => new Map(current).set(next.id, state));

    setState({ phase: "uploading", percent: 0 });
    uploader({
      file: next.file,
      token,
      apiOrigin,
      signal: controller.signal,
      onProgress: (percent) => setState({ phase: "uploading", percent }),
    })
      .then((result) => setState({ phase: "done", transferId: result.transferId }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          // Row was removed; drop its state instead of showing an error.
          setStates((current) => {
            const nextMap = new Map(current);
            nextMap.delete(next.id);
            return nextMap;
          });
          return;
        }
        const message =
          err instanceof UploadError
            ? err.message
            : "Upload failed. Check your connection and try again.";
        setState({ phase: "error", message });
      })
      .finally(() => {
        activeRef.current = null;
        // Re-render so the effect runs again and picks up the next pending file.
        setStates((current) => new Map(current));
      });
  }, [files, token, apiOrigin, uploader, states]);

  return states;
}
