import { useId, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "~/shared/ui/button";
import { FieldError } from "~/shared/components/FieldError";
import { ExpiryPills } from "~/features/room/components/ExpiryPills";
import { DEFAULT_EXPIRY } from "~/features/room/constants/expiry";
import type { Expiry } from "~/features/room/types/expiry";

/**
 * The landing's create card: owns the expiry choice, submits it, and surfaces the
 * pending and error states. Creation itself is the caller's concern (onCreate).
 */
export function CreateRoomCard({
  onCreate,
  pending,
  error,
}: {
  onCreate: (expiry: Expiry) => void;
  pending: boolean;
  error: boolean;
}) {
  const [expiry, setExpiry] = useState<Expiry>(DEFAULT_EXPIRY);
  const errorId = useId();

  return (
    <form
      className="border-border mt-[30px] max-w-[30rem] rounded-[16px] border bg-[color-mix(in_oklab,var(--card)_88%,transparent)] p-5 shadow-[var(--shadow-md)]"
      onSubmit={(event) => {
        event.preventDefault();
        // Guard re-entrant submits (a fast second Enter) on the non-idempotent
        // create path; the disabled CTA is only a UI guard.
        if (pending) return;
        onCreate(expiry);
      }}
    >
      <span className="font-mono text-[11px] tracking-[0.16em] text-[var(--color-ink-subtle)] uppercase">
        New room · expires in
      </span>

      <ExpiryPills value={expiry} onChange={setExpiry} disabled={pending} />

      <Button
        type="submit"
        loading={pending}
        aria-describedby={error ? errorId : undefined}
        className="w-full gap-[9px] rounded-[10px] px-4 py-[13px] text-[15px] font-medium shadow-[var(--shadow-sm)]"
      >
        Create a room
        <ArrowRight aria-hidden="true" size={16} strokeWidth={2.2} />
      </Button>

      <p className="mt-3 px-[2px] text-center font-mono text-[11px] tracking-[0.01em] text-[var(--color-ink-subtle)]">
        no sign-up · nothing kept after it expires
      </p>

      {error && (
        <FieldError id={errorId} className="mt-3 text-center">
          Couldn&apos;t create the Room. Try again.
        </FieldError>
      )}
    </form>
  );
}
