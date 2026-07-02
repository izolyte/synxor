import { useCallback, useRef, useState, type DragEvent } from "react";

export interface NativeFileDropHandlers {
  onDragEnter: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDragLeave: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
}

function hasDirectoryEntry(items: DataTransferItemList): boolean {
  for (const item of Array.from(items)) {
    const entry = item.webkitGetAsEntry?.();
    if (entry?.isDirectory) return true;
  }
  return false;
}

/**
 * OS → browser file drag-and-drop (the native HTML5 DataTransfer API — out of
 * reach for dnd-kit, which drags DOM elements, not filesystem entries). A
 * dragenter/dragleave depth counter is what keeps `dragActive` from flickering
 * as the pointer crosses child elements inside the drop target.
 */
export function useNativeFileDrop({
  onFiles,
  onFolderRejected,
}: {
  onFiles: (files: File[]) => void;
  onFolderRejected: () => void;
}): { dragActive: boolean; handlers: NativeFileDropHandlers } {
  const [dragActive, setDragActive] = useState(false);
  const dragDepth = useRef(0);

  const onDragEnter = useCallback((event: DragEvent) => {
    event.preventDefault();
    if (!event.dataTransfer.types?.includes("Files")) return;
    dragDepth.current += 1;
    setDragActive(true);
  }, []);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
  }, []);

  const onDragLeave = useCallback((event: DragEvent) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragActive(false);
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      dragDepth.current = 0;
      setDragActive(false);

      if (event.dataTransfer.items.length > 0 && hasDirectoryEntry(event.dataTransfer.items)) {
        onFolderRejected();
        return;
      }
      onFiles(Array.from(event.dataTransfer.files));
    },
    [onFiles, onFolderRejected],
  );

  return { dragActive, handlers: { onDragEnter, onDragOver, onDragLeave, onDrop } };
}
