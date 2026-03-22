import dotenv from "dotenv";
import { defineConfig, devices } from "@playwright/test";
import {
  PLAYWRIGHT_APP_PORT,
  PLAYWRIGHT_CLIENT_PORT,
} from "./tests/playwrightDb.js";
import { getPlaywrightMongoUrl } from "./tests/uiTestUtils.js";

dotenv.config();

const isCI = process.env.CI === "true";
const playwrightMongoUrl = getPlaywrightMongoUrl();

process.env.PLAYWRIGHT_MONGO_URL = playwrightMongoUrl;
process.env.PLAYWRIGHT_APP_MONGO_URL = playwrightMongoUrl;

export default defineConfig({
  globalTeardown: './tests/globalTeardown.js',
  testDir: "./tests",
  testMatch: "**/*.spec.{js,ts}",
  testIgnore: ["**/integration/**", "**/setup/**"],
  globalSetup: "./tests/globalSetup.js",
  globalTeardown: "./tests/globalTeardown.js",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  timeout: 60_000,
  reporter: "html",
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${PLAYWRIGHT_CLIENT_PORT}`,
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "npm start",
      url: `http://127.0.0.1:${PLAYWRIGHT_APP_PORT}`,
      env: {
        ...process.env,
        PORT: PLAYWRIGHT_APP_PORT,
        DEV_MODE: "test",
        MONGO_URL: playwrightMongoUrl,
        JWT_SECRET: process.env.JWT_SECRET || "playwright-jwt-secret",
        BRAINTREE_MERCHANT_ID:
          process.env.BRAINTREE_MERCHANT_ID || "playwright-merchant-id",
        BRAINTREE_PUBLIC_KEY:
          process.env.BRAINTREE_PUBLIC_KEY || "playwright-public-key",
        BRAINTREE_PRIVATE_KEY:
          process.env.BRAINTREE_PRIVATE_KEY || "playwright-private-key",
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "npm run client",
      url: `http://127.0.0.1:${PLAYWRIGHT_CLIENT_PORT}`,
      env: {
        ...process.env,
        HOST: "127.0.0.1",
        DANGEROUSLY_DISABLE_HOST_CHECK: "true",
        PORT: PLAYWRIGHT_CLIENT_PORT,
        BROWSER: "none",
      },
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
