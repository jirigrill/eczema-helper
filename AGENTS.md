# AGENTS.md

Guidance for AI agents working in this repository.

## Project Overview

Eczema Tracker PWA — personal app for tracking a breastfed newborn's atopic eczema through elimination diet. v1 is single-device on the breastfeeding mother's phone, Czech UI. See [ADR-0001](docs/adr/0001-single-device-v1.md). Medical photos use AES-256-GCM + PBKDF2-derived keys inside the encrypted manual-export blob; encryption-at-rest in IndexedDB is deferred past v1 with a shipping constraint, see [ADR-0005](docs/adr/0005-photo-encryption-deferred.md).

**Status:** Foundation-first build of v1, the Protocol Executor (see [ADR-0007](docs/adr/0007-v1-scope.md)). The HTML prototype in `docs/design/redesign-prototype.html` is the design source of truth; SvelteKit routes are being re-authored against it. Persistence comes back as Dexie/IndexedDB in slice 1 ([ADR-0006](docs/adr/0006-dexie-persistence.md), [ADR-0008](docs/adr/0008-tracer-bullet-slices.md)). No server-side backend or auth in v1; the derived-insight engine ships in v1.1.

## Documentation

**Before changing the domain or making architectural decisions**, read `CONTEXT.md` (domain vocabulary + invariants) and `docs/adr/` (numbered architectural decisions). The invariant index in `CONTEXT.md` points to the relevant ADRs. Do not introduce vocabulary or decisions that conflict with what is recorded there; revise the ADR instead.

- `UBIQUITOUS_LANGUAGE.md` — shared vocabulary for all domain, UI, and architecture terms; the first place to look up or define a term
- `CONTEXT.md` — deep definitions and invariants for core domain concepts (linked from `UBIQUITOUS_LANGUAGE.md`)
- `docs/adr/` — numbered architectural decision records (ADR-0001 … ADR-0011 so far)
- `docs/README.md` — project status + structure overview
- `docs/architecture/tech-stack.md` — framework and runtime choices
- `docs/architecture/ports-and-adapters.md` — hexagonal architecture, current ports/adapters around Dexie

## Tech Stack

- **Framework:** SvelteKit 2 + TypeScript (strict mode)
- **Runtime:** Bun
- **Styling:** Tailwind CSS 4 (mobile-first)
- **Adapter:** @sveltejs/adapter-static (static PWA, `fallback: 'index.html'` for client-side routing)
- **PWA:** @vite-pwa/sveltekit (kept for offline-first work, not yet wired)
- **Local DB (v1):** Dexie / IndexedDB. Normalized tables, reactive queries via `liveQuery`. See [ADR-0006](docs/adr/0006-dexie-persistence.md).
- **Crypto:** Web Crypto API (AES-256-GCM, PBKDF2). v1 uses it for the encrypted manual-export blob ([ADR-0002](docs/adr/0002-backup-floor.md)); the same primitives unlock photo encryption-at-rest when [ADR-0005](docs/adr/0005-photo-encryption-deferred.md)'s shipping constraint requires it.
- **Backend:** none in v1. A small entitlement API may appear once subscriptions are in scope; not before.
- **Deployment:** Static bundle rsynced to `/var/www/eczema/` on VPS, served by Caddy.

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
just health       # Check https://eczema.nofiat.me/ is up
```

Run `just` or `just help` for the full recipe list.

## Design System

**Always read `DESIGN.md` before modifying or creating any UI component or page.** It contains the authoritative color tokens, typography scale, spacing conventions, border radius rules, and component patterns for this app. Do not introduce colors, font sizes, spacing, or component shapes that deviate from it.

High-fidelity HTML prototypes live in `docs/design/`:
- `docs/design/redesign-prototype.html` — all screens (static canvas + interactive prototype mode, toggle with Esc)
- `docs/design/redesign.png` — static screenshot export
- `docs/design/components-showcase.html` — all `lib/components/` with variant states side by side

**Whenever a component in `src/lib/components/` is modified (props, variants, styles) or a new component is added, update `docs/design/components-showcase.html` to match.** Each component section in the showcase has a `<!-- sync with: src/lib/components/Foo.svelte -->` comment marking which file it mirrors.

### Component Reuse & Extraction Rule

Before implementing any new UI element in a route:

1. **Check existing components first.** Scan `src/lib/components/` — if a component already covers the design item (or can be extended via props/variants), use it. Do not re-implement it inline.
2. **Extract before use when reuse is plausible.** If the design item is not an obvious one-off singleton (appears on more than one screen, or represents a recurring UI pattern), create it as a named component in `src/lib/components/` first, then import it into the route.
3. **Singleton exception.** Truly one-off layout sections tightly coupled to a single route with no design-system generality may live inline — but this is the exception, not the default.

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
- **Snippets:** Use a file-local `{#snippet}` when the same template block appears more than once in the same file and extracting it as a component would be overkill (no reuse outside the file, no independent test value). Use a snippet prop (`children`, `right`, `action`, etc.) on a component when callers need to inject varying markup into a fixed shell. Extract a full component when the pattern appears across multiple files or carries its own logic worth testing in isolation.

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

- UI text in Czech. Display text never lives inline on domain records (see [ADR-0014](docs/adr/0014-presentation-strings-and-domain-keys.md)):
  - **Strings layer** (`src/lib/strings/`) — pure Czech text keyed by domain identifier or ergonomic name, `satisfies Record<DomainKind, ...>` where applicable:
    - `phases.ts` — `{ label, badgeLabel, description }` keyed by `PhaseType`
    - `portions.ts` — `{ label, short }` keyed by `PortionKind`
    - `categories.ts` — `categoryStrings` (`{ name }` keyed by `CatalogAllergenId`) + `subitemStrings` (keyed by `SubitemId`)
    - `meals.ts` — `{ label }` keyed by `MealType`
    - `actions.ts` (buttons/verbs), `common.ts` (toasts, headers, empty states) — UI chrome
  - **Config layer** (`src/lib/config/`) — merges `strings/` text with visual tokens (icon, Tailwind badge/background classes); single lookup point for consumers:
    - `phases.ts` — spreads `phaseStrings` + adds `{ icon, badge, iconBg }`
    - `meals.ts` — spreads `mealStrings` + adds `{ icon }`
    - `categories.ts` — re-exports `getCategoryConfig` from `$lib/data/allergen-catalog`, which merges `categoryStrings[id].name` with the catalog record's `icon` (the icon co-locates on the `CanonicalAllergen` record per [ADR-0017](docs/adr/0017-allergen-catalog-storage-and-harvest.md), not in `config/`)
  - Rule of placement: pure Czech text → `strings/`; visual tokens alongside text → `config/` (which imports from `strings/`)
  - All entries `as const`; both layers require the `satisfies Record<>` clause — missing keys must fail `bunx tsc --noEmit`
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
1. `UBIQUITOUS_LANGUAGE.md` — any new domain, UI, or architecture terms introduced? Add them. Any existing term renamed or redefined? Update it here first, then in code.
2. `CONTEXT.md` — vocabulary still matches the code? Update deep definitions and invariants if the domain model changed.
3. `docs/adr/` — any new architectural decisions to record, or any ADRs to revise?
4. `docs/README.md` — still accurate?
5. `AGENTS.md` — conventions/commands still match?
6. Grep for dead imports (`grep -rn "\\\$lib/" src/`) after deletes.

**Term ownership rule:** every named concept that appears in more than one file (type name, route label, component name, phase name) must have an entry in `UBIQUITOUS_LANGUAGE.md`. If it is a core domain invariant, it also gets a deep entry in `CONTEXT.md`. If it drives an architectural decision, it also gets an ADR.
