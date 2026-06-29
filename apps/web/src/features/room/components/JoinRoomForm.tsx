import { useEffect, useId, useRef, useState } from "react";
import { Button } from "~/shared/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "~/shared/ui/input-otp";
import { cn } from "~/shared/utils/cn";
import { ROOM_CODE_LENGTH } from "~/features/room/constants/room-code";
import type { JoinError } from "~/features/room/types/join-error";

// Codes are 6 upper-case alphanumerics. Strip non-alphanumerics and keep the last
// six, so a paste survives stray spaces, punctuation, or a copied ".../room/ABC123"
// tail (which collapses to "ROOMABC123" → "ABC123").
const sanitize = (raw: string) =>
  raw
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(-ROOM_CODE_LENGTH);

const ERROR_COPY: Record<JoinError, string> = {
  rejected: "Room not found or expired.",
  network: "Couldn't reach the server. Check your connection and try again.",
};

/**
 * The Join Room form: owns the Room Code entry, auto-submits once it's complete,
 * and surfaces the pending and error states. Joining itself is the caller's
 * concern (onJoin); onErrorClear lets the caller drop a stale failure on edit.
 */
export function JoinRoomForm({
  onJoin,
  pending,
  error,
  onErrorClear,
  hintId,
}: {
  onJoin: (roomCode: string) => void;
  pending: boolean;
  error: JoinError | null;
  onErrorClear: () => void;
  /** id of the visible hint, so the field is described by it (and the error, when shown). */
  hintId?: string;
}) {
  const [code, setCode] = useState("");
  const [shaking, setShaking] = useState(false);
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const submitLockRef = useRef(false);
  const complete = code.length === ROOM_CODE_LENGTH;

  // A rejected code clears the cells, shakes the row (the OTP convention for "try
  // again"), and returns focus, so the next attempt is a straight retype. A network
  // failure keeps the code — nothing's wrong with it — so the user just retries.
  useEffect(() => {
    if (error !== "rejected") return;
    setCode("");
    setShaking(true);
    inputRef.current?.focus();
  }, [error]);

  // Release the submit latch once the attempt settles: pending falls back to false
  // on failure; a success navigates away and unmounts.
  useEffect(() => {
    if (!pending) submitLockRef.current = false;
  }, [pending]);

  const submit = (value: string) => {
    // onComplete and an Enter / click can both fire on the sixth character within
    // the same tick — before `pending` re-renders — so latch synchronously. The
    // disabled CTA and `pending` are the slower UI guards.
    if (pending || submitLockRef.current) return;
    submitLockRef.current = true;
    onJoin(value);
  };

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (complete) submit(code);
      }}
    >
      <div
        data-shake={shaking || undefined}
        onAnimationEnd={(event) => {
          // Only the row's own shake resets the flag — ignore child animations.
          if (event.target === event.currentTarget) setShaking(false);
        }}
        className="relative mx-auto w-full max-w-[20rem] motion-safe:data-[shake=true]:animate-[otp-shake_320ms_var(--ease-out)]"
      >
        <InputOTP
          ref={inputRef}
          maxLength={ROOM_CODE_LENGTH}
          value={code}
          onChange={(next) => {
            // Drop a stale error the moment a new attempt begins.
            if (error) onErrorClear();
            setCode(sanitize(next));
          }}
          onComplete={(next) => {
            const value = sanitize(next);
            if (value.length === ROOM_CODE_LENGTH) submit(value);
          }}
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus
          disabled={pending}
          aria-label="Room Code"
          aria-invalid={error != null || undefined}
          aria-describedby={[hintId, error ? errorId : undefined].filter(Boolean).join(" ") || undefined}
          containerClassName={cn(
            "w-full justify-center gap-3",
            error && "[&_[data-slot=input-otp-slot]]:border-[var(--color-error)]",
            // While joining, keep the cells vivid under the sweep, not dimmed.
            pending && "has-[:disabled]:opacity-100",
          )}
        >
          <InputOTPGroup className="flex-1">
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPGroup className="flex-1">
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>

        {/* Connection sweep: a teal light crosses the row while the join is in
            flight — data moving through the wire. Steady tint under reduced motion. */}
        {pending && <span aria-hidden="true" className="otp-sweep pointer-events-none absolute inset-0" />}
      </div>

      <Button
        type="submit"
        loading={pending}
        disabled={!complete}
        aria-describedby={error ? errorId : undefined}
        className="w-full text-base"
      >
        Join Room
      </Button>

      {/* --color-error-text is theme-split, so it meets AA contrast in both themes. */}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="animate-[message-in_var(--duration-normal)_var(--ease-out)] text-center text-[var(--color-error-text)] text-xs"
        >
          {ERROR_COPY[error]}
        </p>
      )}
    </form>
  );
}
