import { defineConfig, devices } from "@playwright/test";

// E2E runner. Scenarios are the same *.scenario.ts files Vitest runs at the
// component level; the `tsconfig` re-points "~test/runtime" at the Playwright
// adapter so they drive a real browser instead.
export default defineConfig({
  testDir: "./test/scenarios",
  testMatch: "**/*.scenario.ts",
  tsconfig: "./tsconfig.e2e.json",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
