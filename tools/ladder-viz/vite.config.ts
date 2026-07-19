// Standalone Vite root for the ladder-engine visualizer prototype (#522).
// Deliberately NOT the SvelteKit app's vite.config.ts — this tool is never
// shipped (map #518 Notes: "same category as scripts/simulate.ts"), so it
// gets its own dev server instead of a route inside the static build.
// Crosses into src/lib via the same $lib alias SvelteKit uses (svelte.config.js),
// so domain types/functions can be imported without duplicating them —
// import-only today; nothing here writes back into src/lib.
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [svelte()],
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL('../../src/lib', import.meta.url)),
    },
  },
  // Importing real values from src/lib makes esbuild transform those .ts files,
  // and Vite resolves the repo-root tsconfig for them — whose `extends:
  // ./.svelte-kit/tsconfig.json` only exists after `svelte-kit sync`. The
  // `just viz` recipe runs sync first so that file is present.
  server: {
    port: 5180,
  },
});
