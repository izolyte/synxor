import { WifiLow } from "lucide-react";
import type { StallState } from "~/features/room/hooks/useTransferStall";

const COPY: Record<Exclude<StallState, null>, string> = {
  slow: "Slow connection…",
  almost: "Almost done…",
};

/**
 * Below-the-bar hint for a Transfer that's stopped moving. Muted, not an error:
 * the Transfer isn't failing, the connection is just slow (docs/design/15-edge-cases.md).
 * Icon plus words so it never rides on colour alone; role="status" lets a screen
 * reader hear the shift without focus moving. Renders nothing until there's a stall.
 */
export function StallNotice({ state }: { state: StallState }) {
  if (!state) return null;
  return (
    <span role="status" className="flex items-center gap-1 text-xs text-muted-foreground">
      <WifiLow aria-hidden="true" size={13} />
      {COPY[state]}
    </span>
  );
}
