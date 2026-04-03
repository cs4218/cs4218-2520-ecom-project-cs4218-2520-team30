/**
 * Playwright Config for Spike Testing
 * 
 * Author: Tay Kai Jun, A0283343E
 * Module: CS4218 Software Testing - Milestone 3
 * 
 * This config reuses existing running servers (no auto-start)
 * Run your server manually before testing:
 *   Terminal 1: npm start
 *   Terminal 2: npm run client
 */

// Tay Kai Jun, A0283343E
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/nft",
  testMatch: "**/spike-*.spec.js",
  
  // Parallel execution for spike simulation - Tay Kai Jun, A0283343E
  fullyParallel: true,
  workers: 10, // Number of parallel browser instances
  
  timeout: 120_000, // 2 minute timeout per test
  
  // HTML Report - Tay Kai Jun, A0283343E
  reporter: [
    ['html', { outputFolder: 'tests/nft/spike-report', open: 'never' }],
    ['list'],
  ],
  
  expect: {
    timeout: 30_000,
  },
  
  use: {
    // Use localhost:3000 for frontend - Tay Kai Jun, A0283343E
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: 60000,
    actionTimeout: 30000,
  },
  
  // NO webServer - reuse existing running servers
  // Make sure to start manually:
  //   npm start (backend on port 6060)
  //   npm run client (frontend on port 3000)
  
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
