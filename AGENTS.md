# AGENTS.md

Guidance for AI agents working in this repository.

## Project Overview

Eczema Tracker PWA — personal app for tracking a breastfed newborn's atopic eczema through elimination diet. v1 is single-device on the breastfeeding mother's phone, Czech UI. See [ADR-0001](docs/adr/0001-single-device-v1.md). Medical photos use AES-256-GCM + PBKDF2-derived keys inside the encrypted manual-export blob; encryption-at-rest in IndexedDB is deferred past v1 with a shipping constraint, see [ADR-0005](docs/adr/0005-photo-encryption-deferred.md).

**Status:** Foundation-first build of v1, the Protocol Executor (see [ADR-0007](docs/adr/0007-v1-scope.md)). The HTML prototype in `docs/design/redesign-prototype.html` is the design source of truth; SvelteKit routes are being re-authored against it. Persistence comes back as Dexie/IndexedDB in slice 1 ([ADR-0006](docs/adr/0006-dexie-persistence.md), [ADR-0008](docs/adr/0008-tracer-bullet-slices.md)). No server-side backend or auth in v1; the derived-insight engine ships in v1.1.

## Documentation

**Before changing the domain or making architectural decisions**, read `CONTEXT.md` (domain vocabulary + invariants) and `docs/adr/` (numbered architectural decisions). The invariant index in `CONTEXT.md` points to the relevant ADRs. Do not introduce vocabulary or decisions that conflict with what is recorded there; revise the ADR instead.

- `CONTEXT.md` — domain glossary + invariant index
- `docs/adr/` — numbered architectural decision records (ADR-0001 … ADR-0008 so far)
- `docs/README.md` — project status + structure overview
- `docs/architecture/tech-stack.md` — framework and runtime choices
- `docs/architecture/ports-and-adapters.md` — hexagonal architecture (intended shape for re-wired backend)

## Tech Stack

- **Framework:** SvelteKit 2 + TypeScript (strict mode)
- **Runtime:** Bun
- **Styling:** Tailwind CSS 4 (mobile-first)
- **Adapter:** svelte-adapter-bun
- **PWA:** @vite-pwa/sveltekit (kept for offline-first work, not yet wired)
- **Local DB (v1):** Dexie / IndexedDB. Normalized tables, reactive queries via `liveQuery`. See [ADR-0006](docs/adr/0006-dexie-persistence.md).
- **Crypto:** Web Crypto API (AES-256-GCM, PBKDF2). v1 uses it for the encrypted manual-export blob ([ADR-0002](docs/adr/0002-backup-floor.md)); the same primitives unlock photo encryption-at-rest when [ADR-0005](docs/adr/0005-photo-encryption-deferred.md)'s shipping constraint requires it.
- **Backend:** none in v1. A small entitlement API may appear once subscriptions are in scope; not before.
- **Deployment:** Docker image + docker-compose.prod.yml on VPS (will simplify to static bundle behind nginx — see issue #35).

## Directory Layout

```
src/
  routes/               # SvelteKit pages + /api/health endpoint
    +layout.svelte      # App shell
    +page.svelte        # Onboarding / questionnaire
    program/            # Schedule overview
    day/                # Daily detail
    meal/               # Meal logging
    settings/           # Settings
    api/health/         # Liveness probe
  lib/
    domain/             # Pure business logic (models.ts, schedule.ts)
    data/               # Seed data (food categories)
    utils/              # Generic helpers (date, uuid, error)
    components/         # UI components
    server/             # Server infra (kept for future: logger, env, db, bcrypt, rate-limit, shutdown, validation)
    crypto/             # Web Crypto AES-256-GCM helpers
    types/              # Shared type helpers (Result<T, E>)
  hooks.server.ts       # Minimal pass-through (no auth yet)
  app.d.ts              # Empty App namespace
```

## Architecture Intent

Ports & Adapters (Hexagonal). Pure domain logic lives in `lib/domain/`. Ports under `lib/domain/ports/` define interfaces for persistence and other I/O. Adapters under `lib/adapters/` implement them. Slice 1 reintroduces the ports + adapters layer for Dexie persistence — hexagonal applies to local I/O too, not only to a remote backend. See `docs/architecture/ports-and-adapters.md` and [ADR-0006](docs/adr/0006-dexie-persistence.md).

## Commands

```bash
just dev          # Start Vite dev server (no backend yet)
just build        # Type-check + build
just check        # Same as build
just deploy       # Build Docker image and deploy to VPS
just health       # Curl /api/health on remote
```

Run `just` or `just help` for the full recipe list.

## Design System

**Always read `DESIGN.md` before modifying or creating any UI component or page.** It contains the authoritative color tokens, typography scale, spacing conventions, border radius rules, and component patterns for this app. Do not introduce colors, font sizes, spacing, or component shapes that deviate from it.

High-fidelity HTML prototypes live in `docs/design/`:
- `docs/design/redesign-prototype.html` — all screens (static canvas + interactive prototype mode, toggle with Esc)
- `docs/design/redesign.png` — static screenshot export

## Code Standards

### TypeScript

- Strict mode. No `any` — use `unknown` and narrow.
- Prefer `type` over `interface` unless declaration merging is needed.
- Use discriminated unions for variants, not optional fields.
- Exhaustive switch with `never` checks.
- No enums — use `as const` objects or string literal unions.
- Explicit return types on exported functions.

### Naming

- Files: `kebab-case.ts`, `kebab-case.svelte`
- Types/interfaces: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE` for true constants, `camelCase` for derived values
- Test files: `*.test.ts` colocated next to source

### Imports

- Group order: (1) svelte/sveltekit, (2) third-party, (3) `$lib` aliases, (4) relative. Blank line between groups.
- Use `$lib/` alias for imports from `src/lib/`. No `../../../` paths.
- Prefer named exports. Default exports only for Svelte page/layout components.

### Error Handling

- Prefer `Result<T, E>` types (from `$lib/types/result`) for expected failures.
- Thrown exceptions only for truly unexpected failures.
- Never swallow errors silently.

### Svelte 5

- `$props()`, `$state()`, `$derived()` runes. No legacy `$:` reactive statements.
- Callback props (`onclick`, `onsubmit`), not `createEventDispatcher`.
- Tailwind utility classes. Scoped `<style>` only when Tailwind can't express it.

### Testing

Two tiers — see `docs/architecture/testing-strategy.md` for full rationale.

**Tier 1 — Vitest + @testing-library/svelte** (`src/**/*.test.ts`, colocated):
- Domain logic, adapters, utility functions — test pure inputs/outputs.
- Svelte components — test rendering, prop variants, user interactions, edge-case states.
- Mock `$app/navigation` and `$app/stores` via `vi.mock(...)` for components that call `goto` or read `$page`.
- `fake-indexeddb` is loaded globally in `src/test-setup.ts`; Dexie works without extra setup.

**Tier 2 — Playwright** (`tests/e2e/**/*.test.ts`):
- Navigation flows that span multiple routes.
- Reactive behaviors driven by live Dexie queries (e.g. layout redirect when DB is cleared).
- PWA and offline scenarios.

**Rule of thumb:** if the assertion is "component renders X" or "clicking Y calls Z", use Tier 1. If the assertion is "user ends up on route /foo after action", use Tier 2.

### Security

- Never log sensitive data (passwords, tokens, decrypted photos, API keys).
- Validate/sanitize external input at adapter boundaries.
- Parameterized SQL only.
- Encryption keys and passphrases never leave the client except as derived key material.

## Conventions

- UI text in Czech (inlined in components — i18n module was removed during slim-down, re-add when translations are needed)
- Dates formatted Czech-style: `5. 3.` (non-breaking space between day and month)
- Food categories seeded in `src/lib/data/categories.ts`

## Agent Guidelines

### Claude Code

- Use `Read`, `Edit`, `Write`, `Grep`, `Glob` for file operations.
- Use `Bash` for shell commands.
- Use `Task` for multi-step exploration.

### Common

- Always read files before editing.
- Prefer dedicated tools over `cat`/`sed`/`awk` via bash.
- Never commit secrets.
- Follow existing code conventions.

## Pull Request Workflow

All changes go through a PR. Direct pushes to `main` are blocked. PRs squash-merged — title becomes commit subject, body becomes commit description.

**PR title format:**
```
<scope>: <imperative summary under 72 chars>
```
Examples:
- `prototype: tighten schedule generation for severe eczema`
- `ci: fix type check on Bun 1.2`
- `docs: note minimum Node version`

Use `ci:`, `docs:`, `fix:`, `feat:`, `refactor:`, `chore:` prefixes.

**PR description template:**
```
## What
Brief description of the change.

## Why
Motivation or context.

## Examples (if applicable)
Before/after snippet, API example, or screenshot.
```

CI checks required before merge:
- **Type Check** — `bunx tsc --noEmit`
- **Build** — `bun run build`

(Test CI re-added when test coverage is authored.)

### After PR Is Merged

Once a PR is merged into `main`, always run these three steps before starting any new work:

```bash
git checkout main
git pull
git branch -d <feature-branch>
```

### Commit Messages

- Prefix with scope: `prototype:`, `ci:`, `docs:`, `fix:`, `feat:`, `refactor:`, `chore:`
- Keep descriptions concise, action-oriented (add, fix, update, remove).
- Do not add Co-Authored-By lines.

## When Modifying the Repo

After significant changes, verify:
1. `CONTEXT.md` — vocabulary still matches the code?
2. `docs/adr/` — any new architectural decisions to record, or any ADRs to revise?
3. `docs/README.md` — still accurate?
4. `AGENTS.md` — conventions/commands still match?
5. Grep for dead imports (`grep -rn "\\\$lib/" src/`) after deletes.
