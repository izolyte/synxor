import { WifiOff } from "lucide-react";
import { Button } from "~/shared/ui/button";

/**
 * Terminal connection state: socket.io exhausted its reconnect attempts, so the
 * Room can't recover on its own (docs/design/15-edge-cases.md). A full-border
 * alert — icon and words, never colour alone — carrying the one action that fixes
 * it. role="alert" announces it the moment it appears; the copy names the state
 * and the fix, and doesn't apologise (PRODUCT voice).
 *
 * `onRefresh` defaults to a full reload — the surest way back to a live socket —
 * and is injectable so specs don't reload the test runner.
 */
export function ConnectionAlert({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-error-border)] bg-[var(--color-error-subtle)] px-4 py-3 text-center"
    >
      <p className="flex items-center gap-2 text-sm font-medium text-[var(--color-error-text)]">
        <WifiOff aria-hidden="true" size={16} />
        Lost connection. Refresh to continue.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRefresh ?? (() => window.location.reload())}
      >
        Refresh
      </Button>
    </div>
  );
}
