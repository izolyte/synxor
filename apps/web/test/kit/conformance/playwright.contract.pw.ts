// The Playwright adapter running the SAME contract function as Vitest. Green
// here proves the Playwright driver behaves identically to the reference — the
// whole point of the seam. Uses page.setContent for the fixture, so no app or
// dev server is needed. Run: playwright test --config playwright.contract.config.ts

import { test } from "@playwright/test";

import { createPlaywrightDriver } from "~test/kit/adapters/playwright/driver";
import { assertTwoListsContract, TWO_LISTS_FIXTURE } from "./contract";

test("two-lists contract holds", async ({ page }) => {
  await page.setContent(TWO_LISTS_FIXTURE);
  await assertTwoListsContract(createPlaywrightDriver(page));
});
