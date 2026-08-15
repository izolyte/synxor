import { useCallback, useEffect, useState } from "react";
import { isRunningStandalone } from "~/shared/utils/pwa";

/** localStorage counter of distinct visits — gates the install control to returners. */
export const PWA_VISITS_KEY = "pwa:visits";
/** Per-session guard so one browsing session only counts as a single visit. */
export const PWA_SESSION_KEY = "pwa:counted";

/**
 * The `beforeinstallprompt` event isn't in the DOM lib types. Only the two members
 * we touch are declared.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Counts this visit once per session and reports whether the visitor has been here
 * before. The install control only wants returners, so a first visit reads as
 * non-repeat even though it bumps the count to 1.
 */
function recordVisit(): boolean {
  try {
    let visits = Number(localStorage.getItem(PWA_VISITS_KEY)) || 0;
    if (!sessionStorage.getItem(PWA_SESSION_KEY)) {
      visits += 1;
      localStorage.setItem(PWA_VISITS_KEY, String(visits));
      sessionStorage.setItem(PWA_SESSION_KEY, "1");
    }
    return visits >= 2;
  } catch {
    // Storage blocked (private mode) — treat as a first-time visitor and stay quiet.
    return false;
  }
}

/**
 * Captures Chromium's deferred install prompt and exposes a gated trigger. The
 * control is only offered once a prompt is actually in hand AND the visitor is a
 * returner — never on first paint, and we never auto-prompt. Everything reads the
 * browser after mount, so SSR and the first client render agree on "nothing yet".
 */
export function usePwaInstall(): { canInstall: boolean; promptInstall: () => Promise<void> } {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isRepeatVisitor, setIsRepeatVisitor] = useState(false);

  useEffect(() => {
    // Already installed (launched standalone) — there's nothing to offer.
    if (isRunningStandalone()) {
      setInstalled(true);
      return;
    }
    setIsRepeatVisitor(recordVisit());

    const onBeforeInstallPrompt = (event: Event) => {
      // Suppress Chrome's mini-infobar; we drive the invitation ourselves.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    // The event is single-use whatever the choice; drop it so the control hides.
    setDeferred(null);
  }, [deferred]);

  return { canInstall: !installed && isRepeatVisitor && deferred !== null, promptInstall };
}
