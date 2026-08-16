import { useEffect } from "react";

/**
 * Registers the service worker after mount. It exists only to power the Web Share
 * Target (see public/sw.js) — the app runs fine without it, so a registration
 * failure is swallowed. Renders nothing.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // No share target this session; nothing else depends on the worker.
    });
  }, []);

  return null;
}
