import { defineConfig } from 'vitest/config';

// Standalone config for integration tests.
// Integration tests make HTTP requests to the running SvelteKit dev server,
// so they don't need Vite's plugin chain (SvelteKit, PWA, Tailwind).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['./tests/global-setup.ts'],
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    sequence: { shuffle: false },
  },
});
