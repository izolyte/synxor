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
  const requestId = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(resetTimer.current);
    };
  }, []);

  const copy = useCallback((text: string) => {
    const id = ++requestId.current;
    clearTimeout(resetTimer.current);
    const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    if (!clipboard?.writeText) {
      setStatus("error");
      return;
    }
    clipboard.writeText(text).then(
      () => {
        if (!mounted.current || id !== requestId.current) return;
        setStatus("copied");
        resetTimer.current = setTimeout(() => {
          if (mounted.current && id === requestId.current) setStatus("idle");
        }, COPIED_RESET_MS);
      },
      () => {
        if (!mounted.current || id !== requestId.current) return;
        setStatus("error");
      },
    );
  }, []);

  return { status, copy };
}
