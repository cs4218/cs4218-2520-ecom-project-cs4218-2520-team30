require("dotenv").config();

const { defineConfig, devices } = require("@playwright/test");
const { getMongoTargets } = require("./tests/uiTestUtils");

const isCI = process.env.CI === "true";
const mongoTargets = process.env.MONGO_URL ? getMongoTargets() : null;

module.exports = defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  timeout: 30_000,
  workers: 1,
  reporter: "html",
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: [
    {
      name: "backend",
      command: "npm start",
      url: "http://localhost:6060",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        PORT: "6060",
        ...(mongoTargets
          ? { MONGO_URL: mongoTargets.playwrightMongoUrl }
          : {}),
        JWT_SECRET: process.env.JWT_SECRET || "playwright-jwt-secret",
        BRAINTREE_MERCHANT_ID:
          process.env.BRAINTREE_MERCHANT_ID || "playwright-merchant-id",
        BRAINTREE_PUBLIC_KEY:
          process.env.BRAINTREE_PUBLIC_KEY || "playwright-public-key",
        BRAINTREE_PRIVATE_KEY:
          process.env.BRAINTREE_PRIVATE_KEY || "playwright-private-key",
      },
    },
    {
      name: "frontend",
      command: "npm run client",
      url: "http://localhost:3000",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        BROWSER: "none",
        DANGEROUSLY_DISABLE_HOST_CHECK: "true",
        PORT: "3000",
      },
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
