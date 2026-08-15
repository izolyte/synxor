import { act } from "@testing-library/react";
import { vi } from "vitest";
import { useCountdown } from "~/features/room/hooks/useCountdown";
import { DAY, HOUR, MINUTE, SECOND } from "~/shared/constants/time";
import { renderHook } from "~test/kit/component";
import { expect, suite, test } from "~test/kit";

suite("useCountdown", () => {
  test("returns null without an expiry (Receiver session)", () => {
    const { current } = renderHook(() => useCountdown(undefined));
    expect(current).toBe(null);
  });

  test("is live well before expiry", () => {
    const future = new Date(Date.now() + 2 * HOUR).toISOString();
    const { current } = renderHook(() => useCountdown(future));
    expect(current?.phase).toBe("live");
  });

  test("is expired once past", () => {
    const past = new Date(Date.now() - SECOND).toISOString();
    const { current } = renderHook(() => useCountdown(past));
    expect(current?.phase).toBe("expired");
  });

  test("ignores an unparseable expiry (corrupt storage)", () => {
    const { current } = renderHook(() => useCountdown("not-a-date"));
    expect(current).toBe(null);
  });

  test("scales the warning to the lifespan when createdAt is present", () => {
    const now = Date.now();
    const expiresAt = new Date(now + 10 * MINUTE).toISOString();
    // A 7-day Room: 10 minutes out is already inside its (scaled) warning window…
    const weekCreatedAt = new Date(now + 10 * MINUTE - 7 * DAY).toISOString();
    expect(renderHook(() => useCountdown(expiresAt, weekCreatedAt)).current?.phase).toBe("expiring");
    // …but with no known lifespan it uses the fixed floor window and stays live.
    expect(renderHook(() => useCountdown(expiresAt)).current?.phase).toBe("live");
  });

  test("recomputes remaining from the wall clock each tick, so it never drifts", () => {
    vi.useFakeTimers();
    const base = Date.parse("2030-01-01T00:00:00.000Z");
    let now = base;
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => now);
    try {
      const expiresAt = new Date(base + 5 * MINUTE).toISOString();
      const result = renderHook(() => useCountdown(expiresAt));
      expect(result.current?.label).toBe("5m 00s");

      // Simulate a backgrounded tab: four minutes of wall time pass but only one
      // tick fires. A counter that decremented per tick would still read ~4m 59s;
      // reading expiresAt - now lands on the true remaining.
      now = base + 4 * MINUTE;
      act(() => vi.advanceTimersByTime(SECOND));
      expect(result.current?.label).toBe("1m 00s");
    } finally {
      nowSpy.mockRestore();
      vi.useRealTimers();
    }
  });
});
