import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const dir = fileURLToPath(new URL(".", import.meta.url));

// Standalone from vite.config.ts on purpose: tests don't need the TanStack Start
// plugin, just React + jsdom. Regex aliases so "~test/…" is never swallowed by
// the "~/…" rule.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^~test\//, replacement: `${path.resolve(dir, "./test")}/` },
      { find: /^~\//, replacement: `${path.resolve(dir, "./src")}/` },
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/kit/adapters/vitest/setup.ts"],
    // Unit + component + the kit's own self-tests, plus journey scenarios (now
    // that VitestDriver.visit mounts routes, scenarios dual-run here too).
    include: ["src/**/*.spec.{ts,tsx}", "test/**/*.spec.{ts,tsx}", "test/**/*.scenario.ts"],
    clearMocks: true,
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/routeTree.gen.ts", "src/vite-env.d.ts", "**/*.spec.*"],
      // Thresholds intentionally off until there is app code worth gating.
    },
  },
});
