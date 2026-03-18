const { defineConfig, devices } = require('@playwright/test');

/**
 * See https://playwright.dev/docs/test-configuration.
 */
module.exports = defineConfig({
  testDir: './tests',
  /* CI/CD and worker configuration from branch */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  /* Timeouts from main */
  timeout: 30_000,
  reporter: 'html',
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  /* webServer config from main */
  webServer: [
    {
      command: 'npm start',
      url: 'http://127.0.0.1:6060',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'CI=false HOST=127.0.0.1 npm run client',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
