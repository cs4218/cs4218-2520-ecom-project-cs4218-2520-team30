import dotenv from "dotenv";
import { defineConfig } from "@playwright/test";

dotenv.config();

process.env.PLAYWRIGHT_MONGO_URL = process.env.MONGO_URL;
process.env.PLAYWRIGHT_APP_MONGO_URL = process.env.MONGO_URL;

export default defineConfig({
  testDir: "./tests",
  testMatch: ["**/*.spec.ts", "**/*.ui.spec.js"],
  testIgnore: ["**/integration/**", "**/setup/**"],
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: "html",
  globalTeardown: "./tests/setup/global-teardown.js",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: [
    {
      command: "node server.js",
      url: "http://127.0.0.1:6060",
      env: {
        ...process.env,
        PORT: "6060",
        DEV_MODE: "test",
      },
      timeout: 30000,
      reuseExistingServer: false,
    },
    {
      command: "npm run client",
      url: "http://127.0.0.1:3000",
      env: {
        ...process.env,
        PORT: "3000",
        HOST: "127.0.0.1",
        BROWSER: "none",
        DANGEROUSLY_DISABLE_HOST_CHECK: "true",
      },
      timeout: 60000,
      reuseExistingServer: false,
    },
  ],
});
