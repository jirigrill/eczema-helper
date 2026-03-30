# AGENTS.md

This file provides guidance to AI agents (Claude Code, opencode/kimi-k2.5, etc.) when working with code in this repository.

## Project Overview

Eczema Tracker PWA — a personal app for tracking a breastfed newborn's atopic eczema through elimination diet. Single-child, two-parent app. Czech UI. All medical photos are E2E encrypted (AES-256-GCM, PBKDF2 key derivation).

## Documentation

All design docs live in `docs/`. Read the relevant phase doc before implementing any feature.

**Current state: Phase 0 and Phase 1 complete.** See phase docs and `docs/README.md` for details.

When adding/changing a feature, update all affected docs:

1. `docs/architecture/data-models.md` — if data model changes
2. `docs/phases/phase-N-*.md` — features, acceptance criteria, implementation steps, tests
3. `docs/README.md` — feature list and phase table
4. This file (AGENTS.md) — if architecture or key decisions change

- `docs/README.md` — project overview and doc index
- `docs/architecture/` — tech stack, architecture, data models, encryption, secrets/auth, offline strategy, API routes, deployment
- `docs/phases/phase-{0-8}-*.md` — implementation phases with features, acceptance criteria, step-by-step instructions, and test suites

## Tech Stack

- **Framework:** SvelteKit 2 + TypeScript (strict mode)
- **Runtime:** Bun
- **Styling:** Tailwind CSS 4 (mobile-first)
- **Server DB:** PostgreSQL 16
- **Local DB:** Dexie.js (IndexedDB, offline-first)
- **Encryption:** Web Crypto API (AES-256-GCM)
- **AI:** Claude Vision API (server-side proxy — API key stays on server, photos forwarded in memory)
- **PWA:** @vite-pwa/sveltekit
- **Adapter:** @sveltejs/adapter-bun
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

Use **Just** for all common tasks (install via `brew install just` or `curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash`):

```bash
just dev              # Start full dev environment (Docker + Caddy + dev server)
just build            # Type-check and build
just test             # Run all tests
just check            # Run full check suite (test + build + lint)
just deploy           # Deploy to VPS (set DEPLOY_HOST env var)
just backup-remote    # Create encrypted backup on VPS
```

Run `just` or `just help` to see all available commands.

### Manual Commands (if not using Just)

```bash
# Local dev environment
docker compose -f docker-compose.dev.yml up -d   # PostgreSQL + app
caddy run --config Caddyfile                       # HTTPS proxy (mkcert)
bun run dev -- --host 0.0.0.0                      # SvelteKit dev server

# Build and type check
bun run build
bunx tsc --noEmit

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

## Code Standards

### TypeScript

- Strict mode (`strict: true` in tsconfig). No `any` — use `unknown` and narrow.
- Prefer `type` over `interface` unless declaration merging is needed.
- Use discriminated unions for variants (e.g., `AnalysisResult`), not optional fields.
- Exhaustive switch with `never` checks: every discriminated union must be fully handled.
- No enums — use `as const` objects or string literal unions.
- Explicit return types on exported functions. Inferred types are fine for local/private functions.

### Naming

- Files: `kebab-case.ts`, `kebab-case.svelte`
- Types/interfaces: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE` for true constants (env vars, config), `camelCase` for derived/computed values
- Database columns: `snake_case` (mapped in adapter layer)
- Test files: `*.test.ts` colocated next to source (e.g., `food-tracking.service.test.ts` next to `food-tracking.service.ts`)

### Imports

- Group in order: (1) svelte/sveltekit, (2) third-party, (3) `$lib` aliases, (4) relative imports. Blank line between groups.
- Use `$lib/` alias for all imports from `src/lib/`. No `../../../` paths.
- Prefer named exports. Default exports only for Svelte page/layout components.

### Error Handling

- Domain services return `Result<T, E>` types (discriminated union `{ ok: true, data: T } | { ok: false, error: E }`), not thrown exceptions.
- Thrown exceptions are reserved for truly unexpected failures (programmer errors, infrastructure failures).
- API endpoints catch adapter errors and return structured JSON responses with appropriate HTTP status codes.
- Never swallow errors silently — always log or propagate.

### Svelte Components

- One component per file. Keep components under ~150 lines; extract sub-components when larger.
- Props: use `$props()` rune (Svelte 5). Destructure with defaults at the top.
- State: use `$state()` and `$derived()` runes. No legacy `$:` reactive statements.
- Events: use callback props (`onclick`, `onsubmit`), not `createEventDispatcher`.
- Styles: use Tailwind utility classes. Scoped `<style>` blocks only for complex selectors Tailwind can't express.

### Testing

- Unit tests for domain services (pure logic, mock ports via interfaces).
- Component tests with `@testing-library/svelte` — test behavior, not implementation.
- E2E tests with Playwright for critical user flows.
- Test names describe behavior: `it('returns correlation when food log overlaps flare window')`.

### Security

- Never log sensitive data (passwords, tokens, decrypted photos, API keys).
- Validate and sanitize all external input at the adapter boundary.
- SQL queries use parameterized statements only — no string interpolation.
- Encryption keys and passphrases never leave the client except as derived key material.

## Agent-Specific Guidelines

### For Claude Code (claude.ai/code)

- Use the `Read`, `Edit`, `Write`, `Grep`, `Glob` tools for file operations
- Use `Bash` tool for terminal commands, git operations, npm/bun, etc.
- Use `Task` tool for multi-step exploration and research tasks

### For opencode (kimi-k2.5)

- Use `read`, `edit`, `write`, `grep`, `glob` tools for file operations
- Use `bash` tool for terminal commands
- Use `websearch`, `webfetch`, `codesearch` for external resources
- Use `Task` tool with `subagent_type` parameter for exploration
- Be concise — minimize output while maintaining helpfulness
- Answer in 1-3 sentences when possible
- Never auto-commit; only commit when explicitly asked
- Report issues at https://github.com/anomalyco/opencode/issues

### Common Guidelines (All Agents)

- Always read files before editing them
- Use specialized tools for file operations, not bash with `cat`, `sed`, `awk`, etc.
- Use `workdir` parameter in bash instead of `cd && command`
- Run lint/typecheck after code changes if available
- Never commit secrets or credentials
- Follow existing code conventions and patterns

### Git Commit Messages

- **Always prefix commits with the current phase**: `Phase X: <description>`
- Example: `Phase 1: add auth API routes and session management`
- Check `docs/phases/` to identify which phase the work belongs to
- Keep descriptions concise and action-oriented (add, fix, update, remove)

### Documentation Maintenance

After implementing features or making significant changes, verify documentation is up to date:

1. **Phase docs** (`docs/phases/phase-N-*.md`) — mark acceptance criteria as complete `[x]`, update file lists if new files were created
2. **Data models** (`docs/architecture/data-models.md`) — if schema or TypeScript interfaces changed
3. **API routes** (`docs/architecture/api-routes.md`) — if endpoints were added or modified
4. **This file** (`CLAUDE.md`) — if key design decisions, commands, or conventions changed
5. **README** (`docs/README.md`) — if implementation status changed

Run a quick check: do the docs still accurately describe what the code does?

### Test Coverage Maintenance

After adding or modifying tests, update `docs/architecture/test-coverage-map.md`:

1. Add the test to the appropriate feature table with its test type (Unit/Integration/E2E)
2. Update the coverage status column (✅ tested / ⚠️ partial / ❌ missing)
3. Remove addressed items from the "Gaps & Recommendations" section
4. Update the "Last updated" date at the top

This document serves as the single source of truth for what is tested and where gaps exist.
