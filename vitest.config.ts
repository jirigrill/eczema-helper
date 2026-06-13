import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(viteConfig, defineConfig({
  resolve: { conditions: ['browser'] },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    exclude: ['e2e/**', 'node_modules/**', '.claude/**', 'tests/e2e/**'],
    include: ['src/**/*.test.ts'],
    // Parallel across test files. `isolate: true` (default) gives each file a
    // fresh module context, so `fake-indexeddb/auto` re-installs a clean global
    // `indexedDB` per file — no cross-file contamination despite parallelism.
    // Threads beat forks here (~15s vs ~17s) because they skip per-fork jsdom
    // boot; the old `forkOptions.singleFork` ran everything serially (~22s).
    pool: 'threads',
    sequence: {
      shuffle: false,
    },
  },
}));
