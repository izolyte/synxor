import { useCallback, useEffect, useRef, useState } from "react";

type CopyStatus = "idle" | "copied" | "error";

// How long the "copied" confirmation lingers before resetting.
const COPIED_RESET_MS = 2000;

/**
 * Copy-to-clipboard with transient feedback. `copied` self-resets after a beat;
 * `error` (clipboard unavailable or rejected — e.g. an insecure context) persists
 * so the UI can offer a manual fallback until the next attempt.
 */
export function useClipboard(): { status: CopyStatus; copy: (text: string) => void } {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const copy = useCallback((text: string) => {
    clearTimeout(resetTimer.current);
    const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    if (!clipboard?.writeText) {
      setStatus("error");
      return;
    }
    clipboard.writeText(text).then(
      () => {
        setStatus("copied");
        resetTimer.current = setTimeout(() => setStatus("idle"), COPIED_RESET_MS);
      },
      () => setStatus("error"),
    );
  }, []);

  return { status, copy };
}
