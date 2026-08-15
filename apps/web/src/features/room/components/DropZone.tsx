import { useCallback, useEffect, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Upload } from "lucide-react";
import { QueuedFileRow } from "~/features/room/components/QueuedFileRow";
import { MAX_FILE_SIZE_BYTES } from "~/features/room/constants/file-queue";
import { useFileQueue } from "~/features/room/hooks/useFileQueue";
import { useFileUploads, type Uploader } from "~/features/room/hooks/useFileUploads";
import { useNativeFileDrop } from "~/features/room/hooks/useNativeFileDrop";
import { formatFileSize } from "~/features/room/utils/format-file-size";
import { cn } from "~/shared/utils/cn";

/**
 * Any Participant's file staging area: drag-and-drop or click-to-browse to queue a
 * file, then drag its handle to reorder the send queue. Two separate drag systems,
 * deliberately: incoming files ride the
 * native HTML5 DataTransfer API (dnd-kit only drags DOM elements, not OS
 * filesystem entries), while reordering the already-queued list is dnd-kit's job.
 *
 * With a `token` + `apiOrigin`, queued files auto-upload in order (#15); without
 * them (no session yet, tests) the zone stays a local queue.
 */
export function DropZone({
  token,
  apiOrigin,
  uploader,
  delivered,
  onActiveChange,
  registerPicker,
}: {
  token?: string;
  apiOrigin?: string;
  /** Test seam; production uses the real chunked uploader. */
  uploader?: Uploader;
  /** transferIds a Receiver has finished downloading — flips a Sent row to
   *  Delivered. Absent (no live socket, tests) leaves rows at Sent. */
  delivered?: ReadonlySet<string>;
  /** Reports whether a local upload is in flight. The Room-sealing window needs
   *  this because an own upload isn't in the socket `transfers` feed until the
   *  server echoes its first progress broadcast. */
  onActiveChange?: (active: boolean) => void;
  /** Hands the file picker up so the composer's attach button can open it — the
   *  bar owns the visible affordance, this zone stays the drop target + queue. */
  registerPicker?: (open: () => void) => void;
}) {
  const { files, notice, addFiles, rejectFolder, removeFile, reorderFiles } = useFileQueue();
  const uploads = useFileUploads(files, token, apiOrigin, uploader);

  const uploading = [...uploads.values()].some((state) => state.phase === "uploading");
  useEffect(() => {
    onActiveChange?.(uploading);
  }, [uploading, onActiveChange]);
  const inputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { dragActive, handlers } = useNativeFileDrop({
    onFiles: addFiles,
    onFolderRejected: rejectFolder,
  });

  const openPicker = useCallback(() => inputRef.current?.click(), []);

  // Lift the picker so the composer's paperclip can trigger the same queue.
  useEffect(() => {
    registerPicker?.(openPicker);
  }, [registerPicker, openPicker]);

  const handlePick = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) addFiles(Array.from(event.target.files));
      event.target.value = ""; // allow re-picking the same file after removal
    },
    [addFiles],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPicker();
      }
    },
    [openPicker],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const overId = event.over?.id;
      if (overId && overId !== event.active.id) {
        reorderFiles(String(event.active.id), String(overId));
      }
    },
    [reorderFiles],
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        data-testid="drop-zone"
        aria-describedby="drop-zone-hint"
        data-state={dragActive ? "drag-over" : "idle"}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        {...handlers}
        className={cn(
          "focus-ring flex w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-lg)]",
          "border border-dashed border-[var(--color-border)] px-3 py-2 text-center",
          "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]",
          dragActive &&
            "border-2 border-solid border-[var(--color-primary)] bg-[var(--color-primary-subtle)]",
        )}
      >
        <Upload aria-hidden="true" size={16} className="shrink-0 text-muted-foreground" />
        {/* Pure CSS per docs/design/09-focus-keyboard.md — no JS pointer detection.
            The accessible name comes from whichever span the media query leaves
            visible; a display:none span is excluded from it by spec, so there's
            no separate aria-label to keep in sync. */}
        <p className="text-muted-foreground text-xs">
          <span className="pointer-coarse:hidden">Drop files here or click to browse</span>
          <span className="hidden pointer-coarse:inline">Tap to browse</span>
        </p>
        {files.length > 1 && (
          <span className="rounded-full bg-[var(--color-primary-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary)] motion-safe:animate-[message-in_var(--duration-fast)_var(--ease-out)]">
            {files.length} files
          </span>
        )}
        <input
          ref={inputRef}
          data-testid="drop-zone-input"
          type="file"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={handlePick}
        />
      </div>
      <span id="drop-zone-hint" className="sr-only">
        Folders aren't supported. Files up to {formatFileSize(MAX_FILE_SIZE_BYTES)}.
      </span>

      {notice && (
        // Keyed by message so a *different* rejection right after another still
        // remounts and replays the entrance, not just the first appearance.
        <p
          key={notice.message}
          role="status"
          className={cn(
            "text-sm motion-safe:animate-[message-in_var(--duration-fast)_var(--ease-out)]",
            notice.kind === "error" ? "text-[var(--color-error-text)]" : "text-muted-foreground",
          )}
        >
          {notice.message}
        </p>
      )}

      {files.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={files.map((queued) => queued.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul role="list" className="flex flex-col gap-1.5">
              {files.map((queued) => {
                const upload = uploads.get(queued.id);
                return (
                  <QueuedFileRow
                    key={queued.id}
                    queued={queued}
                    onRemove={removeFile}
                    upload={upload}
                    delivered={
                      upload?.phase === "done" && (delivered?.has(upload.transferId) ?? false)
                    }
                  />
                );
              })}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
