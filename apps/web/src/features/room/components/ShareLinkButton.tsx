import { useCallback } from "react";
import { Button } from "~/shared/ui/button";
import { useClipboard } from "~/features/room/hooks/useClipboard";

/**
 * "Copy link" that prefers the platform share sheet. On a phone `navigator.share`
 * opens the native sheet — AirDrop, Messages, whichever — which is the natural way
 * to hand a link across devices; a cancelled sheet is a no-op, a real failure
 * falls through to the clipboard. Where there's no share sheet (most desktops) it
 * just copies, so the button always does something useful.
 *
 * Feedback mirrors {@link CopyButton}: a polite live region reports the copy
 * outcome without the button's accessible name changing under a screen reader. The
 * share sheet is its own confirmation, so a successful share stays quiet.
 */
export function ShareLinkButton({ url, title }: { url: string; title: string }) {
  const { status, copy } = useClipboard();

  const share = useCallback(() => {
    const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
    if (canShare) {
      navigator.share({ title, text: title, url }).catch((error: unknown) => {
        // A user-cancelled sheet reports AbortError — nothing failed, so stay quiet.
        if (error instanceof DOMException && error.name === "AbortError") return;
        copy(url);
      });
      return;
    }
    copy(url);
  }, [url, title, copy]);

  return (
    <div className="flex w-full flex-col items-center gap-1.5">
      <Button onClick={share} className="w-full">
        Copy link
      </Button>
      <span
        role="status"
        aria-live="polite"
        className="min-h-[1rem] text-xs text-[var(--color-ink-muted)] data-[state=error]:text-[var(--color-error-text)]"
        data-state={status}
      >
        {status === "copied" && (
          <span
            key={status}
            className="inline-block motion-safe:animate-[message-in_var(--duration-fast)_var(--ease-out)]"
          >
            Link copied
          </span>
        )}
        {status === "error" && (
          <span className="mt-0.5 block select-all break-all font-mono">{url}</span>
        )}
      </span>
    </div>
  );
}
