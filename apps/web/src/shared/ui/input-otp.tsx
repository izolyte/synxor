import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { cn } from "~/shared/utils/cn";

// shadcn/ui InputOTP, adapted to Synxor tokens. One hidden input drives a row of
// styled slots, so paste / mobile autofill / roving focus stay native while the
// cells render the brand. No separator slot — the Room Code is grouped 3 + 3 by
// laying out two InputOTPGroups in JoinRoomForm.
function InputOTP({
  ref,
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput>) {
  return (
    <OTPInput
      ref={ref}
      data-slot="input-otp"
      // The Room Code isn't a credential, so there's no password-manager badge to
      // dodge. Disabling the strategy also drops input-otp's window-reading
      // setInterval/setTimeout, which otherwise fire after jsdom teardown and
      // flake the web test suite ("window is not defined"). Overridable by callers.
      pushPasswordManagerStrategy="none"
      containerClassName={cn(
        "flex items-center gap-2 has-[:disabled]:opacity-50",
        containerClassName,
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="input-otp-group" className={cn("flex items-center gap-2", className)} {...props} />
  );
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & { index: number }) {
  const context = React.useContext(OTPInputContext);
  const slot = context?.slots[index];

  return (
    <div
      data-slot="input-otp-slot"
      data-active={slot?.isActive || undefined}
      data-filled={slot?.char ? true : undefined}
      className={cn(
        // 46×56 cell, kept to that ratio but allowed to flex down on narrow phones
        // (min-h holds the tap target). Radius/size match the brand join artifact.
        "relative flex aspect-[46/56] min-h-[44px] flex-1 items-center justify-center",
        "rounded-[11px] border border-input bg-card",
        "font-mono text-[24px] font-semibold text-foreground",
        "transition-[color,box-shadow,border-color] duration-[var(--duration-fast)]",
        // Filled cell takes a faint teal edge; the active cell gets a primary edge
        // with a soft primary-subtle halo, and dims its glyph to read as the caret.
        "data-[filled=true]:border-primary/30",
        "data-[active=true]:z-10 data-[active=true]:border-primary data-[active=true]:text-[var(--color-ink-subtle)] data-[active=true]:ring-[3px] data-[active=true]:ring-[var(--color-primary-subtle)]",
        className,
      )}
      {...props}
    >
      {slot?.char}
      {/* Empty, unfocused cells carry a muted placeholder dot, like the artifact. */}
      {!slot?.char && !slot?.isActive && (
        <span aria-hidden="true" className="text-[var(--color-ink-subtle)]">
          ·
        </span>
      )}
      {slot?.hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-px bg-foreground motion-safe:animate-[caret-blink_1.2s_ease-out_infinite]" />
        </div>
      )}
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot };
