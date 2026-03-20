import { defineConfig, devices } from "@playwright/test";
import {
  PLAYWRIGHT_APP_PORT,
  PLAYWRIGHT_CLIENT_PORT,
} from "./tests/playwrightDb.js";

const isCI = process.env.CI === "true";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  globalSetup: "./tests/globalSetup.js",
  globalTeardown: "./tests/globalTeardown.js",
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
    baseURL: `http://127.0.0.1:${PLAYWRIGHT_CLIENT_PORT}`,
    trace: "on-first-retry",
  },
  /* webServer config from main */
  webServer: [
    {
      command: "node tests/startUiBackend.js",
      url: `http://127.0.0.1:${PLAYWRIGHT_APP_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "node tests/startUiFrontend.js",
      url: `http://127.0.0.1:${PLAYWRIGHT_CLIENT_PORT}`,
      reuseExistingServer: false,
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
