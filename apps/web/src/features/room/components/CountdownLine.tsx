import type { Countdown } from "~/features/room/types/countdown";

/**
 * Presentational expiry line. Reads its label and urgency from a {@link Countdown}
 * and never computes time itself, so it's a pure function of props. Colour shifts
 * with the phase, and the leading words change too — never colour alone.
 */
export function CountdownLine({ label, phase }: Countdown) {
  return (
    <p
      className="text-center text-sm transition-colors duration-[var(--duration-normal)] data-[phase=expiring]:text-[var(--color-warning-text)] data-[phase=live]:text-[var(--color-ink-muted)]"
      data-phase={phase}
    >
      {phase === "expiring" ? "Expiring soon · " : "Expires in "}
      {label}
    </p>
  );
}
