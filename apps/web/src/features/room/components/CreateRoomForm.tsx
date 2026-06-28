import { useState } from "react";
import { Button } from "~/shared/ui/button";
import { ExpiryField } from "~/features/room/components/ExpiryField";
import { DEFAULT_EXPIRY } from "~/features/room/constants/expiry";
import type { Expiry } from "~/features/room/types/expiry";

// One const so the alert's id and the button's aria-describedby can't drift.
const ERROR_ID = "create-error";

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

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        onCreate(expiry);
      }}
    >
      <ExpiryField value={expiry} onChange={setExpiry} disabled={pending} />

      <Button
        type="submit"
        loading={pending}
        aria-describedby={error ? ERROR_ID : undefined}
        className="w-full text-base"
      >
        Create Room
      </Button>

      {/* --color-error-text is theme-split, so it meets AA contrast in both themes. */}
      {error && (
        <p
          id={ERROR_ID}
          role="alert"
          className="animate-[message-in_var(--duration-normal)_var(--ease-out)] text-[var(--color-error-text)] text-xs"
        >
          Couldn&apos;t create the Room. Try again.
        </p>
      )}
    </form>
  );
}
