// One shared async function asserting through the port only. The Screen import is
// type-only, so any adapter runs the exact same code — that sameness is what
// "behaves identically" means. Fixture: two regions ("active", "done") each
// containing "Melvin", with "Ghost" appearing nowhere.

import type { Screen } from "~test/kit";

export async function assertTwoListsContract(screen: Screen) {
  await screen
    .within({ testId: "active" })
    .find({ text: "Melvin" })
    .shouldBeVisible();
  await screen
    .within({ testId: "done" })
    .find({ text: "Melvin" })
    .shouldBeVisible();
  await screen
    .within({ testId: "done" })
    .find({ text: "Ghost" })
    .shouldNotExist();
}

export const TWO_LISTS_FIXTURE = `
  <div>
    <section data-testid="active"><span>Melvin</span></section>
    <section data-testid="done"><span>Melvin</span></section>
  </div>`;
