// Unit level. Crosses only the framework seam (TestKit) — no UI, no Driver.
// Imports `suite/test/expect` from the kit, never from Vitest, so the
// framework stays swappable here too.

import { cn } from "~/shared/utils/cn";
import { expect, suite, test } from "~test/kit";

suite("cn", () => {
  test("drops falsy classes", () => {
    expect(cn("a", false, null, "b")).toBe("a b");
  });

  test("later Tailwind utility wins the merge", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
