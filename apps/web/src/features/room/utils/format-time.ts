// Transfer Log timestamp column: wall-clock hour:minute in the viewer's locale.
// The Log only spans a single Room session, so a time-of-day label is enough —
// no date, no relative "N min ago" churn that would need a ticking re-render.
const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatTransferTime(ms: number): string {
  return timeFormat.format(ms);
}
