import { defineConfig, devices } from "@playwright/test";

// E2E runner. Scenarios are the same *.scenario.ts files Vitest runs at the
// component level; the `tsconfig` re-points "~test/runtime" at the Playwright
// adapter so they drive a real browser instead.
//
// Two modes:
//   default          — spins up `pnpm dev` (frontend only) for render-level
//                       scenarios that don't need a backend.
//   E2E_BASE_URL set — points at an already-running stack (the Docker Compose web
//                      service on :3001, api on :3000) and starts no server of its
//                      own. The CI e2e job uses this to run the full-transfer
//                      journey against the real Socket.io + tRPC + Postgres/MinIO.
const externalBaseURL = process.env.E2E_BASE_URL;
const baseURL = externalBaseURL ?? "http://localhost:3000";

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
    baseURL,
    // The external stack terminates TLS with a dev self-signed cert.
    ignoreHTTPSErrors: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  // Against an external stack there's nothing for Playwright to boot.
  ...(externalBaseURL
    ? {}
    : {
        webServer: {
          command: "pnpm dev",
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }),
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
