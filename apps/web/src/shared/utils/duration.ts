import { DAY, HOUR, MINUTE, SECOND } from "~/shared/constants/time";

/**
 * Formats a duration in milliseconds for human display, laddered by magnitude:
 * days+hours far out, hours+minutes within a day, minutes+seconds in the last hour
 * (seconds zero-padded so the tail visibly ticks). Negatives clamp to zero.
 */
export function formatDuration(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / SECOND);
  const days = Math.floor(clamped / DAY);
  const hours = Math.floor((clamped % DAY) / HOUR);
  const minutes = Math.floor((clamped % HOUR) / MINUTE);
  const seconds = totalSeconds % 60;

  if (days >= 1) return `${days}d ${hours}h`;
  if (hours >= 1) return `${hours}h ${minutes}m`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}
