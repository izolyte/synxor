import { cn } from "~/shared/utils/cn";

/**
 * Linear transfer progress per docs/design/10-components.md: 6px default (4px
 * compact), primary fill on the subtle track, never a spinner. The fill keeps a
 * 4px minimum so 0% still reads as a live bar, not an empty slot.
 */
export function TransferProgressBar({
  percent,
  label,
  compact = false,
}: {
  percent: number;
  /** Accessible name, e.g. "Uploading video.mp4". */
  label: string;
  compact?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn(
        "w-full overflow-hidden rounded-[var(--radius-full)] bg-[var(--color-primary-subtle)]",
        compact ? "h-1" : "h-1.5",
      )}
    >
      <div
        className="h-full min-w-1 rounded-[var(--radius-full)] bg-[var(--color-primary)] transition-[width] duration-[var(--duration-fast)] ease-[var(--ease-linear)]"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
