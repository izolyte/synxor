// Resolves the active runtime adapter. Default is Vitest; Playwright's config
// aliases "~test/runtime" to its own adapter, so the same *.scenario.ts file runs
// under either runner.
export { runtime } from "./kit/adapters/vitest";
