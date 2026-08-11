import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

const sharedExclude = ['e2e/**', 'node_modules/**', '.claude/**', 'tests/e2e/**'];

// DOM-dependent tests (Svelte components, route pages) are confined to these
// two trees. Everything else — domain, adapters, stores, config — is
// pure logic that runs in the much cheaper `node` environment, skipping the
// ~0.7s/file jsdom boot. fake-indexeddb works under node.
const domGlobs = ['src/lib/components/**/*.test.ts', 'src/routes/**/*.test.ts'];

export default mergeConfig(
  viteConfig,
  defineConfig({
    resolve: { conditions: ['browser'] },
    test: {
      globals: true,
      setupFiles: ['src/test-setup.ts'],
      exclude: sharedExclude,
      // Parallel across files. `isolate: true` (default) gives each file a fresh
      // module context, so `fake-indexeddb/auto` re-installs a clean global
      // `indexedDB` per file. Threads skip per-fork jsdom boot.
      pool: 'threads',
      sequence: { shuffle: false },
      // Split by environment: pure-logic tests avoid jsdom entirely.
      projects: [
        {
          extends: true,
          test: {
            name: 'node',
            environment: 'node',
            include: ['src/**/*.test.ts', 'src/**/*.test.svelte.ts', 'tools/**/*.test.ts'],
            exclude: [...sharedExclude, ...domGlobs],
          },
        },
        {
          extends: true,
          test: {
            name: 'jsdom',
            environment: 'jsdom',
            include: domGlobs,
            exclude: sharedExclude,
          },
        },
      ],
    },
  }),
);
