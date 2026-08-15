// Browser probes for the install affordances. Kept pure and guarded for SSR so
// the hook and the iOS hint can read them without duplicating the checks.

/** True once the app is running as an installed PWA (any platform). */
export function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari never matches display-mode; it exposes navigator.standalone instead.
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return window.matchMedia?.("(display-mode: standalone)").matches || iosStandalone;
}

/**
 * True on iPhone/iPad/iPod. iPadOS 13+ masquerades as desktop Safari, so the
 * classic UA test is backed up by the touch-capable "MacIntel" tell.
 */
export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}
