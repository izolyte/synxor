import { CheckCircle2 } from "lucide-react";
import type { TransferProgressPayload } from "~/features/room/constants/transfer";
import { useDeliveryFlash } from "~/features/room/hooks/useDeliveryFlash";

/**
 * Receiver's Delivery flash: a prominent, centred confirmation that fires once
 * each time a Transfer finishes downloading, then clears itself. This is the
 * moment the whole flow points at (PRODUCT.md) — success-green, a check, the
 * name of what landed. The overlay is `pointer-events-none` so it never traps
 * the Receiver mid-download; it announces politely for screen readers and, under
 * reduced motion, simply appears in place with no travel or scale.
 */
export function DeliveryFlash({
  delivered,
  transfers,
  /** Test seam — how long each flash stays up. */
  displayMs,
}: {
  delivered: ReadonlySet<string>;
  transfers: TransferProgressPayload[];
  displayMs?: number;
}) {
  const flash = useDeliveryFlash(delivered, transfers, displayMs);

  return (
    <>
      {/* A live region only announces changes made while it's already in the DOM,
          so it stays mounted and empty — the visual flash below carries no
          aria-live of its own, keeping the announcement to one voice. */}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {flash && `Transfer delivered${flash.fileName ? `: ${flash.fileName}` : ""}`}
      </span>

      {flash && (
        <div
          className="pointer-events-none fixed inset-0 z-[var(--z-toast)] flex items-center justify-center p-[var(--space-6)]"
          style={{ paddingBottom: "calc(var(--space-6) + env(safe-area-inset-bottom))" }}
        >
          <div
            // Re-keyed per delivery so a back-to-back flash replays the entrance
            // instead of sitting static.
            key={flash.transferId}
            className="flex flex-col items-center gap-[var(--space-3)] rounded-[var(--radius-lg)] border border-[var(--color-success-border)] bg-[var(--color-surface-raised)] px-[var(--space-8)] py-[var(--space-6)] text-center shadow-[var(--shadow-xl)] motion-safe:animate-[delivery-flash-in_var(--duration-slow)_var(--ease-out)]"
          >
            <CheckCircle2
              aria-hidden="true"
              size={48}
              strokeWidth={2}
              className="text-[var(--color-success)]"
            />
            <div className="flex flex-col gap-[var(--space-1)]">
              <span className="text-[length:var(--text-lg)] font-semibold text-[var(--color-ink)]">
                Delivered
              </span>
              {flash.fileName && (
                <span
                  dir="auto"
                  className="max-w-[min(20rem,70vw)] truncate text-[length:var(--text-sm)] text-[var(--color-ink-muted)]"
                >
                  {flash.fileName}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
