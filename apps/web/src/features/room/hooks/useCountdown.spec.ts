import { useCountdown } from "~/features/room/hooks/useCountdown";
import { HOUR, SECOND } from "~/shared/constants/time";
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
});
