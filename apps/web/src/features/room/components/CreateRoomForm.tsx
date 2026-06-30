import { useId, useState } from "react";
import { Button } from "~/shared/ui/button";
import { FieldError } from "~/shared/components/FieldError";
import { ExpiryField } from "~/features/room/components/ExpiryField";
import { DEFAULT_EXPIRY } from "~/features/room/constants/expiry";
import type { Expiry } from "~/features/room/types/expiry";

/**
 * The Create Room form: owns the expiry selection, submits it, and surfaces the
 * pending and error states. Creation itself is the caller's concern (onCreate).
 */
export function CreateRoomForm({
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
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        // Guard re-entrant submits (e.g. a fast second Enter) on the
        // non-idempotent create path; the disabled CTA is only a UI guard.
        if (pending) return;
        onCreate(expiry);
      }}
    >
      <ExpiryField value={expiry} onChange={setExpiry} disabled={pending} />

      <Button
        type="submit"
        loading={pending}
        aria-describedby={error ? errorId : undefined}
        className="w-full text-base"
      >
        Create Room
      </Button>

      {error && <FieldError id={errorId}>Couldn&apos;t create the Room. Try again.</FieldError>}
    </form>
  );
}
