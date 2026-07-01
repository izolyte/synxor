import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { File, GripVertical, Image, X } from "lucide-react";
import type { QueuedFile } from "~/features/room/hooks/useFileQueue";
import { formatFileSize } from "~/features/room/utils/format-file-size";
import { Button } from "~/shared/ui/button";
import { cn } from "~/shared/utils/cn";

/** Icon per docs/design/17-iconography.md's role map: image icon for image/*, generic file otherwise. */
function FileTypeIcon({ mimeType }: { mimeType: string }) {
  const Icon = mimeType.startsWith("image/") ? Image : File;
  return <Icon aria-hidden="true" size={20} />;
}

/** One queued file: dnd-kit sortable row (drag handle reorders the send queue). */
export function QueuedFileRow({
  queued,
  onRemove,
}: {
  queued: QueuedFile;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: queued.id,
  });

  // Dragged row reads as physically lifted (scale + shadow), not just dimmed.
  // Scale rides the same `transform` dnd-kit already sets inline (a class-based
  // `scale-*` utility would lose to that inline style), and the lift's own
  // opacity/shadow transition is folded into dnd-kit's `transition` string for
  // the same reason — a separate `transition-*` class would never apply.
  const baseTransform = CSS.Transform.toString(transform);
  const liftTransition = "opacity var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)";

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: isDragging ? `${baseTransform ?? ""} scale(1.02)`.trim() : baseTransform,
        transition: [transition, liftTransition].filter(Boolean).join(", "),
      }}
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm",
        // Matches the "Transfer Log row appears" spec (docs/design/07-motion.md) —
        // fires once on mount for a newly-queued file; reordering keeps the same
        // key, so it never replays for existing rows.
        "motion-safe:animate-[message-in_var(--duration-normal)_var(--ease-out)]",
        isDragging && "relative z-[var(--z-raised)] opacity-90 shadow-[var(--shadow-lg)]",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Reorder ${queued.file.name}`}
        className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden="true" size={16} />
      </Button>
      <FileTypeIcon mimeType={queued.file.type} />
      <span dir="auto" title={queued.file.name} className="min-w-0 flex-1 truncate">
        {queued.file.name}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatFileSize(queued.file.size)}
      </span>
      {queued.warning && (
        <span className="shrink-0 text-xs text-[var(--color-warning-text)]">
          {queued.warning}
        </span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Remove ${queued.file.name}`}
        onClick={() => onRemove(queued.id)}
        className="shrink-0"
      >
        <X aria-hidden="true" size={16} />
      </Button>
    </li>
  );
}
