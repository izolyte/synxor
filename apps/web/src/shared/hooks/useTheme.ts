import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

/** localStorage key — shared with the flash-free init script in __root.tsx. */
export const THEME_STORAGE_KEY = "theme";

/** The `.dark` class on <html> is the single source of truth for the active theme. */
function readDomTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    // Storage can throw in private mode or when blocked; treat as "no preference".
    return null;
  }
}

/**
 * Flip the `.dark` class to `theme`. Unless `instant`, the swap is wrapped in a
 * one-frame transition freeze (double rAF, docs/design/12-dark-mode.md) so every
 * color cuts over at once instead of crossfading — the latter reads as a flash.
 */
function applyTheme(theme: Theme, { instant = false }: { instant?: boolean } = {}): void {
  const root = document.documentElement;
  const isDark = theme === "dark";
  if (root.classList.contains("dark") === isDark) return;

  if (instant) {
    root.classList.toggle("dark", isDark);
    return;
  }

  root.classList.add("no-transitions");
  root.classList.toggle("dark", isDark);
  const raf =
    typeof requestAnimationFrame === "function"
      ? requestAnimationFrame
      : (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0);
  raf(() => raf(() => root.classList.remove("no-transitions")));
}

/**
 * Reads and controls the active theme. The `.dark` class is applied before
 * hydration by the inline script in __root, so state is seeded from the DOM after
 * mount (keeping SSR and the first client render in agreement). While no manual
 * choice is stored, the theme follows the OS; `toggle` writes an explicit,
 * persistent override.
 */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(readDomTheme());

    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      // A manual choice is sticky — only follow the OS while none is stored.
      if (readStoredTheme()) return;
      const next: Theme = event.matches ? "dark" : "light";
      applyTheme(next, { instant: true });
      setTheme(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = readDomTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage unavailable — the class still flips for this session.
    }
    setTheme(next);
  }, []);

  return { theme, toggle };
}
