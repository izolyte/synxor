import { useCallback, useEffect, useRef, useState } from "react";
import { ROOM_CODE_LENGTH } from "~/features/room/constants/room-code";
import { sanitizeRoomCode } from "~/features/room/utils/room-code";
import type { JoinError } from "~/features/room/types/join-error";

/**
 * Owns Room Code entry for the Join form: the sanitized value, completeness, the
 * re-entrant submit latch, and the rejected-code reset (clear + shake + refocus).
 * The form stays presentational and this — the fiddly part — is unit-testable.
 */
export function useRoomCodeEntry({
  pending,
  error,
  initialCode,
  onJoin,
  onErrorClear,
}: {
  pending: boolean;
  error: JoinError | null;
  initialCode?: string;
  onJoin: (code: string) => void;
  onErrorClear: () => void;
}) {
  const sanitizedInitialCode = sanitizeRoomCode(initialCode);
  const [code, setCode] = useState(sanitizedInitialCode);

  useEffect(() => {
    setCode(sanitizedInitialCode);
  }, [sanitizedInitialCode]);
  const [shaking, setShaking] = useState(false);
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

  const submit = useCallback(
    (value: string) => {
      // onComplete and an Enter / click can both fire on the sixth character within
      // the same tick — before `pending` re-renders — so latch synchronously.
      if (pending || submitLockRef.current) return;
      submitLockRef.current = true;
      onJoin(value);
    },
    [pending, onJoin],
  );

  const change = useCallback(
    (next: string) => {
      // Drop a stale error the moment a new attempt begins.
      if (error) onErrorClear();
      setCode(sanitizeRoomCode(next));
    },
    [error, onErrorClear],
  );

  const completeWith = useCallback(
    (next: string) => {
      const value = sanitizeRoomCode(next);
      if (value.length === ROOM_CODE_LENGTH) submit(value);
    },
    [submit],
  );

  const submitCurrent = useCallback(() => {
    if (complete) submit(code);
  }, [complete, code, submit]);

  const endShake = useCallback(() => setShaking(false), []);

  return { code, complete, shaking, inputRef, change, completeWith, submitCurrent, endShake };
}
