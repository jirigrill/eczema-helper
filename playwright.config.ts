import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

// Single port for both modes so `baseURL` below stays valid regardless of
// which server we boot. Locally we run the Vite dev server (reuses an already
// running `just dev`, reflects live edits); in CI we serve a production build
// once with `vite preview` — no on-demand compilation to bottleneck parallel
// workers, and it exercises the same static artifact we deploy.
const PORT = 5173;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Auto (~half the cores) locally; capped in CI where runners are smaller.
  // Pushing local workers higher (e.g. 75%) measured no speedup — the single
  // Vite dev server serializes on-demand compilation and is the real ceiling.
  workers: isCI ? 2 : undefined,
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
    command: isCI
      ? `bun run build && bunx vite preview --port ${PORT}`
      : 'bunx svelte-kit sync && bun run dev',
    port: PORT,
    reuseExistingServer: !isCI,
    // CI pays a one-time `bun run build` here, so give it more headroom.
    timeout: isCI ? 120_000 : 60_000,
  },
});
