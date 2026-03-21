import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  testIgnore: ["**/integration/**", "**/setup/**"],
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: [
    ["html"],
    ["json", { outputFile: "playwright-report/results.json" }],
  ],
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
