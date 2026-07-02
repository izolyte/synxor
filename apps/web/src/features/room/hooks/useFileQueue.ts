import { useCallback, useState } from "react";
import { IGNORED_FILENAMES, MAX_FILE_SIZE_BYTES } from "~/features/room/constants/file-queue";
import { formatFileSize } from "~/features/room/utils/format-file-size";

export interface QueuedFile {
  id: string;
  file: File;
  /** Non-blocking, per-file: e.g. a zero-byte file still queues. */
  warning?: string;
}

export interface DropNotice {
  kind: "error" | "warning";
  message: string;
}

// name+size+lastModified is the same-file heuristic from docs/design/15-edge-cases.md;
// it also doubles as the row key, so re-dropping a queued file is a no-op lookup.
function fileKey(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

/**
 * Local, upload-free file queue for the Drop Zone (issue #13 is UI-only — no
 * network calls). One `notice` slot surfaces the most recent zone-level rejection
 * (folder drop, over-size, duplicate); it replaces on the next drop rather than
 * stacking, since only one drop action is ever in flight at a time.
 */
export function useFileQueue() {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [notice, setNotice] = useState<DropNotice | null>(null);

  const rejectFolder = useCallback(() => {
    setNotice({ kind: "error", message: "Folders aren't supported. Select individual files." });
  }, []);

  const addFiles = useCallback((incoming: File[]) => {
    setFiles((current) => {
      const next = [...current];
      const seen = new Set(current.map((queued) => queued.id));
      let pendingNotice: DropNotice | null = null;

      for (const file of incoming) {
        if (IGNORED_FILENAMES.has(file.name)) continue;

        const id = fileKey(file);

        if (seen.has(id)) {
          pendingNotice = { kind: "error", message: "This file is already queued." };
          continue;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          pendingNotice = {
            kind: "error",
            message: `${file.name} exceeds the ${formatFileSize(MAX_FILE_SIZE_BYTES)} size limit.`,
          };
          continue;
        }

        seen.add(id);
        next.push({
          id,
          file,
          warning: file.size === 0 ? "This file is empty." : undefined,
        });
      }

      setNotice(pendingNotice);
      return next;
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((current) => current.filter((queued) => queued.id !== id));
  }, []);

  const reorderFiles = useCallback((activeId: string, overId: string) => {
    if (activeId === overId) return;
    setFiles((current) => {
      const from = current.findIndex((queued) => queued.id === activeId);
      const to = current.findIndex((queued) => queued.id === overId);
      if (from === -1 || to === -1) return current;

      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  return { files, notice, addFiles, rejectFolder, removeFile, reorderFiles };
}
