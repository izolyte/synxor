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
      className="flex flex-col items-center gap-6"
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
        className="relative mx-auto w-full max-w-[321px] motion-safe:data-[shake=true]:animate-[otp-shake_320ms_var(--ease-out)]"
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
            "w-full justify-center",
            error && "[&_[data-slot=input-otp-slot]]:border-[var(--color-error)]",
            // While joining, keep the cells vivid under the sweep, not dimmed.
            pending && "has-[:disabled]:opacity-100",
          )}
        >
          {/* One flat row of six — the artifact drops the 3+3 grouping. */}
          <InputOTPGroup className="w-full gap-[9px]">
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
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
        className="w-full max-w-[321px] text-base"
      >
        Join Room
      </Button>

      {error && (
        <FieldError id={errorId} className="text-center">
          {ERROR_COPY[error]}
        </FieldError>
      )}

      <ScanHint />
    </form>
  );
}

/**
 * The "— or scan from their screen —" affordance below the code field: a decorative
 * QR that mirrors the join artifact. It encodes nothing — scanning happens on the
 * Sender's device via the room link — so it's aria-hidden and purely instructional.
 */
function ScanHint() {
  return (
    <div className="mt-1 flex flex-col items-center gap-3">
      <span className="font-mono text-[10.5px] tracking-[0.12em] text-[var(--color-ink-subtle)] uppercase">
        — or scan from their screen —
      </span>
      <QrMock />
    </div>
  );
}

/**
 * A QR placeholder styled to the artifact. A scannable code must read dark-on-light
 * in either theme, so its two tones are deliberately theme-invariant, not tokens.
 */
function QrMock() {
  const ink = "oklch(0.09 0 0)";
  return (
    <div
      aria-hidden="true"
      className="h-[110px] w-[110px] rounded-[12px] bg-white p-[10px] shadow-[var(--shadow-sm)]"
    >
      <div
        className="relative h-full w-full"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, ${ink} 0 3px, transparent 3px 6px), repeating-linear-gradient(90deg, ${ink} 0 3px, transparent 3px 6px)`,
          backgroundSize: "6px 6px",
        }}
      >
        {[
          "top-0 left-0",
          "top-0 right-0",
          "bottom-0 left-0",
        ].map((pos) => (
          <span
            key={pos}
            className={cn(
              "absolute h-[26px] w-[26px] rounded-[4px] border-[5px] bg-white",
              pos,
            )}
            style={{ borderColor: ink }}
          >
            <span className="absolute inset-[4px] rounded-[2px]" style={{ backgroundColor: ink }} />
          </span>
        ))}
      </div>
    </div>
  );
}
