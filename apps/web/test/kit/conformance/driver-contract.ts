// Registers the shared contract as a test under the active runner. Used by
// adapters whose runner injects no per-test handle (Vitest); adapters that need
// one (Playwright's `page`) call assertTwoListsContract directly from their spec.

import { suite, test } from "~test/kit";
import type { Screen } from "~test/kit";
import { assertTwoListsContract } from "./contract";

export function describeDriverContract(
  label: string,
  loadTwoLists: () => Promise<Screen>,
) {
  suite(`driver contract — ${label}`, () => {
    test("two-lists contract holds", async () => {
      await assertTwoListsContract(await loadTwoLists());
    });
  });
}
