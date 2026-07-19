import { act } from "@testing-library/react";
import { renderHook } from "~test/kit/component";
import { afterEach, expect, suite, test } from "~test/kit";
import { useTheme } from "~/shared/hooks/useTheme";

const isDark = () => document.documentElement.classList.contains("dark");

/** Minimal matchMedia stub whose `change` listener the test drives directly. */
function stubMatchMedia(initial: boolean) {
  let listener: ((event: MediaQueryListEvent) => void) | undefined;
  window.matchMedia = ((query: string) => ({
    matches: initial,
    media: query,
    addEventListener: (_: string, l: (event: MediaQueryListEvent) => void) => (listener = l),
    removeEventListener: () => (listener = undefined),
  })) as unknown as typeof window.matchMedia;
  return {
    emit: (matches: boolean) => act(() => listener?.({ matches } as MediaQueryListEvent)),
  };
}

suite("useTheme", () => {
  afterEach(() => {
    document.documentElement.classList.remove("dark");
    // @ts-expect-error — remove the per-test stub so jsdom's absence is restored.
    delete window.matchMedia;
  });

  test("seeds the active theme from the .dark class", () => {
    document.documentElement.classList.add("dark");
    const hook = renderHook(() => useTheme());
    expect(hook.current.theme).toBe("dark");
  });

  test("follows the OS while no choice is stored", () => {
    const mq = stubMatchMedia(false);
    renderHook(() => useTheme());

    mq.emit(true);
    expect(isDark()).toBe(true);
  });

  test("ignores the OS once a choice is stored", () => {
    localStorage.setItem("theme", "light");
    const mq = stubMatchMedia(false);
    renderHook(() => useTheme());

    mq.emit(true);
    expect(isDark()).toBe(false);
  });
});
