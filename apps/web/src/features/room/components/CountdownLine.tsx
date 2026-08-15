import { Clock } from "lucide-react";
import type { Countdown } from "~/features/room/types/countdown";

/**
 * The expiry countdown as a compact pill in the Room header — a clock glyph and
 * the remaining time in the mono face with tabular figures, so the label holds a
 * fixed width as it ticks. Reads its label and urgency from a {@link Countdown} and
 * never computes time itself. Urgency shifts both the colour and the wording (never
 * colour alone): once the Room is near or past its TTL the pill warms to the warning
 * tone.
 *
 * At "expired" the Room is in its sealing window — TTL is up but a Transfer is still
 * finishing (docs/design/15-edge-cases.md) — so it reads "Expiring…" rather than a
 * bare "0m left"; the live count is meaningless past zero.
 */
export function CountdownLine({ label, phase }: Countdown) {
  const warn = phase === "expiring" || phase === "expired";
  return (
    <span
      data-phase={phase}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs tabular-nums transition-colors duration-[var(--duration-normal)] ${
        warn
          ? "border-transparent bg-[var(--color-warning-subtle)] text-[var(--color-warning-text)]"
          : "border-[var(--border)] bg-[var(--color-bg-subtle)] text-[var(--color-ink-muted)]"
      }`}
    >
      <Clock aria-hidden="true" size={13} className="opacity-80" />
      {phase === "expired"
        ? "Expiring…"
        : phase === "expiring"
          ? `Expiring soon · ${label}`
          : `Expires in ${label}`}
    </span>
  );
}
