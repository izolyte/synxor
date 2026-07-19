import type { Countdown } from "~/features/room/types/countdown";

/**
 * Presentational expiry line. Reads its label and urgency from a {@link Countdown}
 * and never computes time itself, so it's a pure function of props. Colour shifts
 * with the phase, and the leading words change too — never colour alone.
 *
 * At "expired" the Room is in its sealing window — TTL is up but a Transfer is
 * still finishing (docs/design/15-edge-cases.md) — so it reads "Expiring…" rather
 * than a bare "0m left"; the live count is meaningless past zero.
 */
export function CountdownLine({ label, phase }: Countdown) {
  return (
    <p
      className="text-center text-sm transition-colors duration-[var(--duration-normal)] data-[phase=expired]:text-[var(--color-warning-text)] data-[phase=expiring]:text-[var(--color-warning-text)] data-[phase=live]:text-[var(--color-ink-muted)]"
      data-phase={phase}
    >
      {phase === "expired"
        ? "Expiring…"
        : phase === "expiring"
          ? `Expiring soon · ${label}`
          : `Expires in ${label}`}
    </p>
  );
}
