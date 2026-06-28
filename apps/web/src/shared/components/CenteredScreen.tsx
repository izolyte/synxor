import type { ReactNode } from "react";
import { cn } from "~/shared/utils/cn";

/**
 * Full-height, single-column centered screen on the app background — the shell
 * for the create flow and the not-found / error screens. Pass spacing/width via
 * `className` or a child container.
 */
export function CenteredScreen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main
      className={cn(
        "bg-background flex min-h-dvh flex-col items-center justify-center px-4",
        className,
      )}
    >
      {children}
    </main>
  );
}
