import dotenv from "dotenv";
import { defineConfig, devices } from "@playwright/test";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  PLAYWRIGHT_APP_PORT,
  PLAYWRIGHT_CLIENT_PORT,
} from "./tests/playwrightDb.js";

import fs from "fs";
import path from "path";

dotenv.config();

const MONGO_URI_FILE = path.join(process.cwd(), ".playwright_mongo_uri");
let playwrightMongoUrl;

if (process.env.PLAYWRIGHT_MONGO_URL) {
  playwrightMongoUrl = process.env.PLAYWRIGHT_MONGO_URL;
} else {
  // Start a fresh, isolated MongoDB for this test run.
  const mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: "test"
    }
  });
  playwrightMongoUrl = mongoServer.getUri();
  // Write to file for potential other processes, but we don't read it here
  // to avoid stale values from previous runs.
  fs.writeFileSync(MONGO_URI_FILE, playwrightMongoUrl);
}

// Propagate this URL so setup routines and the backend server both use it.
process.env.PLAYWRIGHT_MONGO_URL = playwrightMongoUrl;
process.env.PLAYWRIGHT_APP_MONGO_URL = playwrightMongoUrl;

const isCI = process.env.CI === "true";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.{js,ts}",
  testIgnore: ["**/integration/**", "**/setup/**"],
  globalSetup: "./tests/globalSetup.js",
  globalTeardown: "./tests/globalTeardown.js",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  timeout: 90_000,
  reporter: [["html"], ["json", { outputFile: "playwright-report/results.json" }]],
  expect: {
    timeout: 15_000,
  },
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${PLAYWRIGHT_CLIENT_PORT}`,
    trace: "on-first-retry",
    navigationTimeout: 45000,
    actionTimeout: 15000,
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
