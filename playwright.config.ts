import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./src/test",
  // Limit tests to match the spec file explicitly to avoid running Vitest files in Playwright
  testMatch: /.*\.spec\.ts/,
  timeout: 30000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
