import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.{spec.ts,spec.js}",
  testIgnore: ["**/integration/**", "**/setup/**"],
  timeout: 90000,
  expect: {
    timeout: 15000,
  },
  fullyParallel: false,
  workers: 2,
  retries: 1,
  reporter: "html",
  globalTeardown: "./tests/setup/global-teardown.js",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    navigationTimeout: 45000,
    actionTimeout: 15000,
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
      port: 6060,
      timeout: 30000,
      reuseExistingServer: true,
    },
    {
      command: "cd client && npm start",
      port: 3000,
      timeout: 60000,
      reuseExistingServer: true,
    },
  ],
});
