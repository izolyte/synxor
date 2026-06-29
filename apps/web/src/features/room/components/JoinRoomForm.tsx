import { useId } from "react";
import { Button } from "~/shared/ui/button";
import { FieldError } from "~/shared/components/FieldError";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "~/shared/ui/input-otp";
import { cn } from "~/shared/utils/cn";
import { ROOM_CODE_LENGTH } from "~/features/room/constants/room-code";
import { useRoomCodeEntry } from "~/features/room/hooks/useRoomCodeEntry";
import type { JoinError } from "~/features/room/types/join-error";

const ERROR_COPY: Record<JoinError, string> = {
  rejected: "Room not found or expired.",
  network: "Couldn't reach the server. Check your connection and try again.",
};

/**
 * The Join Room form: a six-cell Room Code field that auto-submits when complete,
 * with pending and error states. Entry logic (sanitize, completeness, submit latch,
 * rejected-code reset) lives in useRoomCodeEntry; this stays presentational.
 */
export function JoinRoomForm({
  onJoin,
  pending,
  error,
  onErrorClear,
  hintId,
  initialCode,
}: {
  onJoin: (roomCode: string) => void;
  pending: boolean;
  error: JoinError | null;
  onErrorClear: () => void;
  /** id of the visible hint, so the field is described by it (and the error, when shown). */
  hintId?: string;
  /** Prefill from a shared link's ?code; sanitized like any other entry. */
  initialCode?: string;
}) {
  const errorId = useId();
  const { code, complete, shaking, inputRef, change, completeWith, submitCurrent, endShake } =
    useRoomCodeEntry({ pending, error, initialCode, onJoin, onErrorClear });

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        submitCurrent();
      }}
    >
      <div
        data-shake={shaking || undefined}
        onAnimationEnd={(event) => {
          // Only the row's own shake resets the flag — ignore child animations.
          if (event.target === event.currentTarget) endShake();
        }}
        className="relative mx-auto w-full max-w-[20rem] motion-safe:data-[shake=true]:animate-[otp-shake_320ms_var(--ease-out)]"
      >
        <InputOTP
          ref={inputRef}
          maxLength={ROOM_CODE_LENGTH}
          value={code}
          onChange={change}
          onComplete={completeWith}
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

      {error && (
        <FieldError id={errorId} className="text-center">
          {ERROR_COPY[error]}
        </FieldError>
      )}
    </form>
  );
}
