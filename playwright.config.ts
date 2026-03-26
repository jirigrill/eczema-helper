import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for Eczema Tracker
 * @see https://playwright.dev
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  // Global timeout for each test (prevents hanging tests)
  timeout: 30000,
  // Expect timeout for assertions
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Action timeout prevents individual actions from hanging
    actionTimeout: 10000,
    // Navigation timeout for page.goto and similar
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  // Note: Run 'just dev' or 'bun run dev' before running E2E tests
  // webServer is disabled - tests expect server already running on localhost:5173
});
