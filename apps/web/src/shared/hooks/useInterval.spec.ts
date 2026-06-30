import { renderHook } from "~test/kit/component";
import { expect, suite, test } from "~test/kit";
import { delay } from "~/shared/utils/delay";
import { useInterval } from "~/shared/hooks/useInterval";

suite("useInterval", () => {
  test("invokes the callback on each tick", async () => {
    let count = 0;
    renderHook(() => useInterval(() => (count += 1), 20));

    await delay(75);

    expect(count >= 2).toBe(true);
  });

  test("pauses when the delay is null", async () => {
    let count = 0;
    renderHook(() => useInterval(() => (count += 1), null));

    await delay(50);

    expect(count).toBe(0);
  });
});
