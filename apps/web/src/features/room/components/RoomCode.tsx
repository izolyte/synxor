/**
 * The Room Code as the focal element of the share view: large, monospace, and
 * selectable so it can be read aloud or copied by hand. The aria-label spells the
 * code out (space-separated) so screen readers announce each character instead of
 * trying to pronounce it as a word; the visible/selectable text stays unspaced.
 */
export function RoomCode({ code }: { code: string }) {
  return (
    <p
      aria-label={`Room Code: ${code.split("").join(" ")}`}
      className="text-foreground select-all text-center font-mono text-5xl font-bold tracking-[var(--tracking-wide)]"
    >
      {code}
    </p>
  );
}
