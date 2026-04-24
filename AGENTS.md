# AGENTS.md

Guidance for AI agents working in this repository.

## Project Overview

Eczema Tracker PWA — personal app for tracking a breastfed newborn's atopic eczema through elimination diet. Single-child, two-parent, Czech UI. Medical photos will be E2E encrypted (AES-256-GCM, PBKDF2) when photo features are wired.

**Status:** Prototype-first frontend. The app lives at `src/routes/` and is a UI-only prototype of the eczema-tracking flow. Backend, persistence, auth, and AI features were removed during a UX pivot and will be re-authored against the new domain when the prototype stabilizes.

## Documentation

- `docs/README.md` — project status + structure overview
- `docs/architecture/tech-stack.md` — framework and runtime choices
- `docs/architecture/ports-and-adapters.md` — hexagonal architecture (intended shape for re-wired backend)

## Tech Stack

- **Framework:** SvelteKit 2 + TypeScript (strict mode)
- **Runtime:** Bun
- **Styling:** Tailwind CSS 4 (mobile-first)
- **Adapter:** svelte-adapter-bun
- **PWA:** @vite-pwa/sveltekit (kept for offline-first work, not yet wired)
- **Future backend:** PostgreSQL 16 + postgres.js, bcrypt, Web Crypto API, Claude Vision API
- **Local offline DB (future):** Dexie.js
- **Deployment:** Docker image + docker-compose.prod.yml on VPS

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

Ports & Adapters (Hexagonal). Currently only the **Domain** layer exists (pure logic in `lib/domain/`). When backend is re-wired, add `lib/domain/ports/` (interfaces) and `lib/adapters/` (implementations) back. See `docs/architecture/ports-and-adapters.md`.

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
1. `docs/README.md` — still accurate?
2. `AGENTS.md` — conventions/commands still match?
3. Grep for dead imports (`grep -rn "\\\$lib/" src/`) after deletes.
