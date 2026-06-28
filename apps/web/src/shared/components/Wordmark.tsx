import type { ReactNode } from "react";
import { cn } from "~/shared/utils/cn";

/**
 * The Synxor mono wordmark/eyebrow label. Used for the brand mark and for the
 * status labels on the not-found / error shells.
 */
export function Wordmark({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "text-muted-foreground font-mono text-xs font-medium tracking-[var(--tracking-display)] uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}
