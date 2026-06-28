import { ToggleGroup, ToggleGroupItem } from "~/shared/ui/toggle-group";
import { EXPIRY_OPTIONS } from "~/features/room/constants/expiry";
import type { Expiry } from "~/features/room/types/expiry";

// Ties the visible label to the radiogroup; one const so id + reference can't drift.
const EXPIRY_LABEL_ID = "expiry-label";

/**
 * Controlled expiry picker: a labelled single-select of how long the Room lives.
 * The active option is a teal pill that slides between options (transform only;
 * text stays above it and never reflows, so the move is smooth and 60fps).
 */
export function ExpiryField({
  value,
  onChange,
  disabled,
}: {
  value: Expiry;
  onChange: (value: Expiry) => void;
  disabled?: boolean;
}) {
  const activeIndex = Math.max(
    0,
    EXPIRY_OPTIONS.findIndex((option) => option.value === value),
  );

  return (
    <div className="flex flex-col gap-2">
      <span id={EXPIRY_LABEL_ID} className="text-foreground text-sm font-medium">
        Expires after
      </span>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(next) => {
          // Radix single-select emits "" when the active item is re-pressed;
          // expiry must always hold a value, so ignore the empty case.
          if (next) onChange(next as Expiry);
        }}
        disabled={disabled}
        aria-labelledby={EXPIRY_LABEL_ID}
        className="relative w-full gap-0 rounded-md border border-input p-1"
      >
        {/* Single sliding pill behind the labels (transform only). Token duration
            collapses to 0ms under prefers-reduced-motion → instant switch. */}
        <span
          aria-hidden="true"
          className="bg-primary pointer-events-none absolute top-1 bottom-1 left-1 z-0 rounded-sm transition-transform duration-[var(--duration-normal)] ease-[var(--ease-out)]"
          style={{
            width: `calc((100% - 0.5rem) / ${EXPIRY_OPTIONS.length})`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
        {EXPIRY_OPTIONS.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className="relative z-10 h-auto min-h-[44px] flex-1 whitespace-nowrap transition-colors duration-[var(--duration-normal)] data-[state=on]:bg-transparent data-[state=on]:text-primary-foreground"
          >
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="text-muted-foreground text-xs">
        The Room and its Transfers are deleted when it expires.
      </p>
    </div>
  );
}
