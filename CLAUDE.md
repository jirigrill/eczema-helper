# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Eczema Tracker PWA — a personal app for tracking a breastfed newborn's atopic eczema through elimination diet. Single-child, two-parent app. Czech UI. All medical photos are E2E encrypted (AES-256-GCM, PBKDF2 key derivation).

## Documentation

All design docs live in `docs/`. Read the relevant phase doc before implementing any feature.

**Current state: documentation only — no code exists yet.** Implementation starts with Phase 0.

When adding/changing a feature, update all affected docs:
1. `docs/architecture/data-models.md` — if data model changes
2. `docs/phases/phase-N-*.md` — features, acceptance criteria, implementation steps, tests
3. `docs/README.md` — feature list and phase table
4. This file (CLAUDE.md) — if architecture or key decisions change

- `docs/README.md` — project overview and doc index
- `docs/architecture/` — tech stack, architecture, data models, encryption, secrets/auth, offline strategy, API routes, deployment
- `docs/phases/phase-{0-8}-*.md` — implementation phases with features, acceptance criteria, step-by-step instructions, and test suites

## Tech Stack

- **Framework:** SvelteKit 2 + TypeScript (strict mode)
- **Styling:** Tailwind CSS 4 (mobile-first)
- **Server DB:** PostgreSQL 16
- **Local DB:** Dexie.js (IndexedDB, offline-first)
- **Encryption:** Web Crypto API (AES-256-GCM)
- **AI:** Claude Vision API (server-side proxy — API key stays on server, photos forwarded in memory)
- **PWA:** @vite-pwa/sveltekit
- **Deployment (dev):** Docker Compose + Caddy + mkcert (HTTPS on LAN)
- **Deployment (prod):** Docker + Nginx + Let's Encrypt on VPS

## Architecture

Ports & Adapters (Hexagonal). Four layers:

1. **UI Layer** (`routes/`, `lib/components/`) — Svelte components, reads stores, calls domain services
2. **Domain Layer** (`lib/domain/services/`) — pure business logic (FoodTrackingService, PhotoDiaryService, AnalysisService, ExportService), no I/O
3. **Ports** (`lib/domain/ports/`) — interfaces: EczemaAnalyzer, PhotoStorage, DataRepository, NotificationService
4. **Adapters** (`lib/adapters/`) — implementations: ClaudeVisionAnalyzer, EncryptedFSStorage, PostgresRepository, WebPushNotifications, Dexie local DB

Domain services depend only on port interfaces, never on adapters directly.

## Key Data Models

Defined in `docs/architecture/data-models.md`. Core entities:

- **FoodLog** — manual elimination/reintroduction events (primary tracking method)
- **Meal + MealItem** — what the mother actually ate (belongs to user, not child)
- **TrackingPhoto** — unified photo entity with `photoType: 'skin' | 'stool'`. Skin photos have bodyArea + severity; stool photos have color, consistency, mucus, blood
- **AnalysisResult** — discriminated union: `SkinAnalysisResult | StoolAnalysisResult`

## Development Commands

```bash
# Local dev environment
docker compose -f docker-compose.dev.yml up -d   # PostgreSQL + app
caddy run --config Caddyfile                       # HTTPS proxy (mkcert)
npm run dev -- --host 0.0.0.0                      # SvelteKit dev server

# Build and type check
npm run build
npx tsc --noEmit

# Access from phone on same WiFi
# https://192.168.x.x (mkcert cert must be trusted on the device)
```

## Key Design Decisions

- **Offline-first**: All mutations go to Dexie.js first, then sync to server. UI is always responsive regardless of network.
- **E2E encryption**: Photos encrypted in browser before upload. Server stores opaque blobs. Passphrase → PBKDF2 (600K iterations) → AES key. Lost passphrase = unrecoverable photos (by design).
- **Single child**: Meals belong to `userId` (the mother), not `childId`. Child context is implicit.
- **Photo types**: `TrackingPhoto` handles both skin and stool. Gallery has filter tabs. Comparison view only allows same-type photos.
- **Correlation**: Driven by manual FoodLog events only (not derived from meal data). Meal data is contextual display.
- **AI calls via server proxy**: Client decrypts photos locally, sends to `POST /api/analyze`. Server forwards to Claude Vision API in memory (never written to disk), streams response back. API key stays server-side. Server sees plaintext briefly in a memory buffer only.
- **Export**: Two methods — PDF (client-side, offline, photos embedded) and Google Doc (server-side, photos uploaded to Drive, shareable with pediatrician).
- **Ghost overlay**: Camera shows previous photo at 30% opacity for consistent framing. Falls back to static SVG silhouette for first photo.
- **Future: Passkeys/WebAuthn**: Face ID/Touch ID login planned for Phase 8 polish. Current auth uses password + 30-day sliding sessions.

## Secrets & Auth

See `docs/architecture/auth-overview.md` for complete details. Key points:
- All env vars documented with generation commands and rotation procedures
- bcrypt (12 rounds) for passwords, cookie-based sessions (30-day sliding), REGISTRATION_ENABLED flag
- Google OAuth refresh tokens encrypted at rest with SESSION_SECRET
- Claude API key stored server-side only; client calls server proxy at `POST /api/analyze`
- Vitest + @testing-library/svelte for unit/component tests, Playwright for E2E

## Conventions

- All UI text in Czech (translations in `lib/i18n/cs.ts`)
- PostgreSQL uses snake_case; TypeScript uses camelCase. Mapping done in PostgresRepository adapter.
- Food categories are seeded data (12 Czech allergen categories with sub-items)
- Dates formatted Czech style: `5.3.` (day.month.)
