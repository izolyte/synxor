import { delay } from "~/shared/utils/delay";
import { expect, suite, test } from "~test/kit";

suite("delay", () => {
  test("resolves only after the wait", async () => {
    let done = false;
    const pending = delay(5).then(() => (done = true));
    expect(done).toBe(false);
    await pending;
    expect(done).toBe(true);
  });
});
