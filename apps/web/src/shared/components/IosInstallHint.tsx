import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";
import { isIos, isRunningStandalone } from "~/shared/utils/pwa";

/** localStorage flag — set once the hint is dismissed so it never returns. */
export const IOS_HINT_DISMISSED_KEY = "pwa:ios-hint-dismissed";

function alreadyDismissed(): boolean {
  try {
    return localStorage.getItem(IOS_HINT_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * iOS Safari has no `beforeinstallprompt`, so there's no way to offer a real
 * install button — the user has to go through Share → Add to Home Screen. This is
 * a one-time, dismissible nudge that spells those steps out, shown only on iOS
 * when not already installed. Once dismissed (or once installed) it's gone for
 * good. Reads the browser after mount so it never renders during SSR.
 */
export function IosInstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isIos() && !isRunningStandalone() && !alreadyDismissed()) setVisible(true);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(IOS_HINT_DISMISSED_KEY, "1");
    } catch {
      // Storage blocked — it stays gone for this session, which is enough.
    }
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Install synxor"
      className="bg-card text-card-foreground border-border shadow-lg flex items-start gap-3 rounded-md border p-[var(--space-4)]"
    >
      <Share aria-hidden="true" size={20} className="text-primary mt-0.5 shrink-0" />
      <p className="text-sm text-pretty">
        Install synxor: tap <span className="font-medium">Share</span>, then{" "}
        <span className="font-medium">Add to Home Screen</span>.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -m-1 shrink-0 rounded-sm p-1 focus-visible:ring-2 focus-visible:outline-none"
      >
        <X aria-hidden="true" size={16} />
      </button>
    </div>
  );
}
