import { TriangleAlert } from "lucide-react";
import type { CountdownPhase } from "~/features/room/types/countdown";
import { useExpiryWarning } from "~/features/room/hooks/useExpiryWarning";

/**
 * One-shot heads-up as a Room nears Expiry, then it clears itself — a nudge to wrap
 * up, not a banner that lingers or re-fires every tick. Warning-amber with an icon
 * and words so it never rides on colour alone; role="alert" so a screen reader hears
 * it the moment it lands. Non-interactive and auto-dismissing (there's nothing to
 * act on — the countdown in the header carries the running detail). Renders nothing
 * until, and after, its single showing. Reduced motion skips the entrance.
 */
export function ExpiryWarningNotice({
  phase,
  /** Test seam — how long the notice stays up. */
  displayMs,
}: {
  phase: CountdownPhase | undefined;
  displayMs?: number;
}) {
  const visible = useExpiryWarning(phase, displayMs);
  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[var(--z-toast)] flex justify-center p-[var(--space-4)]"
      style={{ paddingTop: "calc(var(--space-4) + env(safe-area-inset-top))" }}
    >
      <div
        role="alert"
        className="flex items-center gap-[var(--space-2)] rounded-[var(--radius-lg)] border border-[var(--color-warning-border)] bg-[var(--color-warning-subtle)] px-[var(--space-4)] py-[var(--space-3)] text-[length:var(--text-sm)] font-medium text-[var(--color-warning-text)] shadow-[var(--shadow-lg)] motion-safe:animate-[delivery-flash-in_var(--duration-slow)_var(--ease-out)]"
      >
        <TriangleAlert aria-hidden="true" size={16} />
        Room expiring soon — finish up and save anything you need.
      </div>
    </div>
  );
}
