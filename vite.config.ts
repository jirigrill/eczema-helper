import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  // PROTOTYPE worktree: deps resolve to the main checkout's node_modules, which
  // lives outside this worktree root — allow Vite to serve from there so the
  // SvelteKit client runtime isn't 403'd over /@fs/. Safe to drop when this
  // worktree is removed.
  server: {
    fs: {
      allow: ['/Users/jiri.grill/Developer/eczema-helper'],
    },
  },
  plugins: [
    tailwindcss(),
    sveltekit(),
    {
      name: 'webmanifest-charset',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.endsWith('.webmanifest')) {
            res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
          }
          next();
        });
      }
    },
    SvelteKitPWA({
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: '/',
      },
      devOptions: {
        // PROTOTYPE ONLY — dev service worker DISABLED. The workbox SW hijacks
        // navigation to `/` (navigateFallback), which bounces the prototype
        // route to the app's onboarding page. Disabling it here is safe because
        // this whole worktree/branch is throwaway and never merges to main —
        // main keeps `enabled: true`. DO NOT cherry-pick this file.
        enabled: false,
        type: 'module',
      },
    })
  ],
});
