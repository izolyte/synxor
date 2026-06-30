import { vi } from "vitest";
import { delay } from "~/shared/utils/delay";
import { expect, suite, test } from "~test/kit";

suite("delay", () => {
  test("resolves only after the wait", async () => {
    vi.useFakeTimers();
    try {
      let done = false;
      const pending = delay(5).then(() => (done = true));

      vi.advanceTimersByTime(4);
      await Promise.resolve();
      expect(done).toBe(false);

      vi.advanceTimersByTime(1);
      await pending;
      expect(done).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
