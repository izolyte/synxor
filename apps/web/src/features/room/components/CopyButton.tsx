import { Button, type ButtonProps } from "~/shared/ui/button";
import { useClipboard } from "~/features/room/hooks/useClipboard";

/**
 * Copies `value` to the clipboard and reports the outcome inline. A polite live
 * region carries both the confirmation and the failure fallback, so the result
 * reaches screen readers without the button name changing under them. The region
 * holds its height when idle to avoid layout shift on the first copy.
 */
export function CopyButton({
  value,
  label,
  copiedLabel,
  errorLabel,
  fallbackText,
  variant,
}: {
  value: string;
  label: string;
  copiedLabel: string;
  errorLabel: string;
  fallbackText?: string;
  variant?: ButtonProps["variant"];
}) {
  const { status, copy } = useClipboard();

  return (
    <div className="flex flex-col items-center gap-1.5">
      <Button variant={variant} onClick={() => copy(value)} className="w-full">
        {label}
      </Button>
      <span
        role="status"
        aria-live="polite"
        className="min-h-[1rem] text-xs text-[var(--color-ink-muted)] data-[state=error]:text-[var(--color-error-text)]"
        data-state={status}
      >
        {status !== "idle" && (
          // key remounts per status so the entrance re-fires on each copy; it's the
          // feedback for a real action (clipboard write), not decoration.
          <span
            key={status}
            className="inline-block motion-safe:animate-[message-in_var(--duration-fast)_var(--ease-out)]"
          >
            {status === "copied" ? copiedLabel : errorLabel}
          </span>
        )}
        {status === "error" && fallbackText && (
          <span className="mt-0.5 block select-all break-all font-mono">
            {fallbackText}
          </span>
        )}
      </span>
    </div>
  );
}
