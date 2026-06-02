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
    pool: 'forks',
    forkOptions: {
      singleFork: true,
    },
    sequence: {
      shuffle: false,
    },
  },
}));
