import { defineConfig, devices } from "@playwright/test";

// Minimal config for the adapter conformance run: no webServer (the fixture is
// injected with page.setContent), so it proves the Playwright driver against the
// shared contract without needing the app. Separate from playwright.config.ts,
// which runs the product scenarios (*.scenario.ts) against the real app.
export default defineConfig({
  testDir: "./test/kit/conformance",
  testMatch: "**/*.contract.pw.ts",
  tsconfig: "./tsconfig.e2e.json",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
