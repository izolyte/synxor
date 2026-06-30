import type { ReactNode } from "react";
import { cn } from "~/shared/utils/cn";

/**
 * The narrow, single-column content stack every route screen uses inside
 * CenteredScreen: capped width and consistent vertical rhythm.
 */
export function ScreenColumn({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full max-w-[var(--width-narrow)] flex-col gap-8", className)}>
      {children}
    </div>
  );
}
