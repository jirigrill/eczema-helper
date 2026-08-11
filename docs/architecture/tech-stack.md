# Technology Stack

## Overview

Technologies currently in use. The app is single-device, client-only, with no backend (see [ADR-0001](../adr/0001-single-device-v1.md)) — a SvelteKit + TypeScript PWA that runs entirely in the browser on the mother's phone, storing everything locally in IndexedDB, built with Bun and served as a static bundle. The table below is the full list.

## Stack overview

| Layer        | Technology                                | Notes                                                                |
| ------------ | ----------------------------------------- | -------------------------------------------------------------------- |
| Framework    | SvelteKit 2 + Svelte 5 + TypeScript (strict) | Runes (`$state`, `$derived`, `$props`); no legacy reactive statements |
| Adapter      | `@sveltejs/adapter-static`                | Static PWA, `fallback: 'index.html'` for client routing              |
| Runtime / PM | Bun 1.x                                   | Used for install, dev server, build                                  |
| Styling      | Tailwind CSS 4                            | CSS-first config; tokens defined in `src/app.css`                    |
| Local DB     | Dexie 4 / IndexedDB                       | Normalized tables, reactive `liveQuery` |
| PWA          | `@vite-pwa/sveltekit`                     | Installed; not yet wired for offline shell                           |
| Testing      | Vitest + `@testing-library/svelte` + `fake-indexeddb`; Playwright | See [testing-strategy.md](testing-strategy.md) |
| Deployment   | Static bundle, rsync to VPS, served by Caddy | No app server; no backend                                   |

## Version floor

| Dependency     | Minimum | Notes                                       |
| -------------- | ------- | ------------------------------------------- |
| Bun            | 1.x     | Primary runtime + package manager           |
| Node.js        | 20 LTS  | Fallback for tooling that doesn't run on Bun |
| TypeScript     | 5.3+    | Required by SvelteKit 2                     |
| SvelteKit      | 2.x     | —                                           |
| Svelte         | 5.x     | Runes                                       |
| Tailwind CSS   | 4.x     | New engine                                  |
| Dexie          | 4.x     | TS support + `liveQuery`                    |
| iOS Safari     | 16.4+   | Home-screen install / PWA                   |
| Android Chrome | 120+    | PWA                                         |

## Not built (deliberately out of scope)

The following lived in earlier iterations of this document and are **not** part of the app. They are listed here so future agents don't re-add them by accident.

- **No backend.** No PostgreSQL, no `postgres.js`, no server DB. No app server. No `lib/server/`. ([ADR-0001](../adr/0001-single-device-v1.md))
- **No auth.** No cookie sessions, no bcrypt, no passkeys. Single-device, no accounts.
- **No AI provider.** No Claude Vision proxy, no `/api/analyze` route. The derived-insight engine is not built ([#468](https://github.com/jirigrill/eczema-helper/issues/468); causation-derived rationale, ADR-0004, is parked with the protocol engine — see [parked features](../parked-features.md)).
- **No push notifications.** No web-push, no VAPID.
- **No photo upload.** Photos stay on-device.
- **No application-level encryption and no backup**, so every record including photos sits plaintext in IndexedDB — scope, rationale and the Web Crypto carve-out for UUIDs are in [ADR-0029](../adr/0029-no-crypto-no-backup.md).
- **No charts / no PDF export.** No `uPlot`, no `pdfmake`.

If any of these become relevant, add an ADR before reintroducing the dependency.
