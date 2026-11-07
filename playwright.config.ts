import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright foundation (frontend spec §24).
 *
 * - Chromium desktop + Pixel mobile emulation (mobile is the primary
 *   surface). Firefox/WebKit projects exist locally but are NOT part of
 *   the CI project list (CI installs Chromium only, for stability).
 * - E2E runs against the Vite dev server, with the API mocked at the
 *   network boundary via page.route — NEVER against production, NEVER
 *   with real OAuth credentials.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: {
    command: "pnpm dev --port 5173 --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
