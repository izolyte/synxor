import { useRef } from "react";
import { EXPIRY_OPTIONS } from "~/features/room/constants/expiry";
import type { Expiry } from "~/features/room/types/expiry";
import { cn } from "~/shared/utils/cn";

// The landing's compact pill copy: a big mono duration over a short word. The
// accessible label stays the full phrase so it reads the same as the old field.
const PILL_COPY: Record<Expiry, { big: string; word: string; label: string }> = {
  "1h": { big: "1h", word: "hour", label: "1 hour" },
  "24h": { big: "24h", word: "day", label: "24 hours" },
  "7d": { big: "7d", word: "week", label: "7 days" },
};

/**
 * Inline expiry picker for the landing create card: a radiogroup of pills over the
 * real Expiry values. Roving tabindex + arrow keys give it native radio semantics;
 * the active pill carries the primary accent.
 */
export function ExpiryPills({
  value,
  onChange,
  disabled,
}: {
  value: Expiry;
  onChange: (value: Expiry) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow keys move the selection and carry focus with it, as a radiogroup should.
  const onKeyDown = (index: number) => (event: React.KeyboardEvent) => {
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = (index + delta + EXPIRY_OPTIONS.length) % EXPIRY_OPTIONS.length;
    onChange(EXPIRY_OPTIONS[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Room expiry" className="mt-3 mb-4 flex gap-2">
      {EXPIRY_OPTIONS.map((option, index) => {
        const active = option.value === value;
        const copy = PILL_COPY[option.value];
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={copy.label}
            tabIndex={active ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={onKeyDown(index)}
            className={cn(
              "flex-1 rounded-[9px] border px-1 py-[9px] text-center text-[13px]",
              "transition-colors duration-[var(--duration-fast)]",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              "disabled:pointer-events-none disabled:opacity-50",
              active
                ? "border-primary text-primary bg-[var(--color-primary-subtle)]"
                : "text-muted-foreground border-border bg-background",
            )}
          >
            <span
              className={cn(
                "block font-mono text-[15px] font-semibold tabular-nums",
                active ? "text-primary" : "text-foreground",
              )}
            >
              {copy.big}
            </span>
            {copy.word}
          </button>
        );
      })}
    </div>
  );
}
