import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/shared/utils/cn";

export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-md text-sm font-medium",
    "transition-colors duration-[var(--duration-fast)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
        outline:
          "border border-input bg-transparent hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "min-h-[44px] px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-8",
        icon: "min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Shows a spinner over the label and blocks interaction while a request is in flight. */
  loading?: boolean;
}

/**
 * Renders a styled button with configurable variant and size.
 *
 * @param variant - The visual style variant to apply.
 * @param size - The button size variant to apply.
 * @param loading - When true, overlays a spinner, hides the label, and disables the button.
 */
export function Button({
  className,
  variant,
  size,
  loading = false,
  disabled,
  type,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(
        buttonVariants({ variant, size }),
        loading && "relative cursor-wait disabled:opacity-100",
        className,
      )}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="absolute inset-0 m-auto h-4 w-4 animate-[btn-spin_var(--duration-crawl)_linear_infinite] rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {/* opacity (not visibility) keeps the accessible name while the spinner shows */}
      <span className={cn("inline-flex items-center gap-2", loading && "opacity-0")}>{children}</span>
    </button>
  );
}
