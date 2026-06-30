import type { ReactNode } from "react";
import { cn } from "~/shared/utils/cn";

/**
 * A form/field error line: assertive for screen readers, eases in, and uses the
 * theme-split error-text token so it meets AA contrast in both themes. Alignment
 * and the like come through `className`.
 */
export function FieldError({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      id={id}
      role="alert"
      className={cn(
        "animate-[message-in_var(--duration-normal)_var(--ease-out)] text-xs text-[var(--color-error-text)]",
        className,
      )}
    >
      {children}
    </p>
  );
}
