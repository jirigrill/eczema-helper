import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

const PORT = 5173;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Auto (~half the cores) locally. CI runs on a 4-vCPU ubuntu-latest runner,
  // so we use all 4. Upside is capped either way: the single Vite dev server
  // serializes on-demand compilation and is the real ceiling — pushing local
  // workers past 4 (e.g. 75% = 6) measured no speedup.
  workers: isCI ? 4 : undefined,
  reporter: 'list',
  timeout: 30000,
  expect: { timeout: 10000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Must be the Vite dev server in every environment: the e2e tests seed and
    // inspect IndexedDB by importing app source directly (`import('/src/lib/db/
    // atopic-db.ts')`), which only resolves against the dev server's on-demand
    // module serving. A production preview build doesn't serve /src/** (sources
    // are bundled into hashed assets) → those imports 404 and tests fail.
    command: 'bunx svelte-kit sync && bun run dev',
    port: PORT,
    reuseExistingServer: !isCI,
    timeout: 60_000,
  },
});
