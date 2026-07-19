// Standalone Vite root for the ladder-engine visualizer (#530, PRD #527).
// Deliberately NOT the SvelteKit app's vite.config.ts — this tool is never
// shipped (map #518 Notes: "same category as scripts/simulate.ts"), so it gets
// its own dev server rather than a route inside the static build. It crosses
// into src/lib via the same `$lib` alias SvelteKit uses, so domain types and
// functions are imported read-only, never duplicated. No Tailwind (#522).
import { svelte } from '@sveltejs/vite-plugin-svelte';

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [svelte()],
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL('../../src/lib', import.meta.url)),
    },
  },
  server: {
    port: 5180,
  },
});
