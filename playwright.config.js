import { defineConfig, devices } from "@playwright/test";

const isCI = process.env.CI === "true";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  /* CI/CD and worker configuration from branch */
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  /* Timeouts from main */
  timeout: 30_000,
  reporter: "html",
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  /* webServer config from main */
  webServer: [
    {
      command: "PORT=6060 npm start",
      url: "http://localhost:6060",
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
    {
      command: "PORT=3000 BROWSER=none npm run client",
      url: "http://localhost:3000",
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
