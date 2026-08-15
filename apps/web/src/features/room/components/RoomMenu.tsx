import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

/**
 * The Room header's overflow (⋯) menu: a single home for the actions that don't
 * earn a spot in the always-visible chrome — today just the Sender's Delete Room.
 * A light disclosure, not a full menubar: the kebab toggles a small panel,
 * Escape closes it, and a click outside dismisses it. Rendered only when there's
 * something to put inside, so a Receiver never sees an empty kebab.
 */
export function RoomMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Room menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="focus-ring grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-subtle)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-ink)]"
      >
        <MoreHorizontal aria-hidden="true" size={18} />
      </button>

      {open && (
        <div
          id={panelId}
          role="menu"
          className="absolute right-0 top-full z-[var(--z-dropdown)] mt-1.5 min-w-[16rem] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-popover)] p-3 shadow-[var(--shadow-lg)]"
        >
          {children}
        </div>
      )}
    </div>
  );
}
