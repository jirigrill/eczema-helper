# AGENTS.md

Guidance for AI agents working in this repository.

## Project Overview

Eczema Tracker PWA — tracks a breastfed newborn's atopic eczema through elimination diet. Single-device, the mother's phone, Czech UI. [ADR-0001](docs/adr/0001-single-device-v1.md)

**Status:** The app is a Protocol Executor — onboarding, today view, meal logging with conflict detection, program timeline, skin + photo. `docs/design/redesign-prototype.html` is the design source of truth; SvelteKit routes are authored against it. No backend or auth. Encrypted export/import (#438) and the derived-insight engine (#468) are not built yet.

## Documentation

**Before changing the domain or making architectural decisions**, read `CONTEXT.md` and `docs/adr/`. Don't introduce vocabulary or decisions that conflict with what's recorded there — revise the ADR instead.

- `UBIQUITOUS_LANGUAGE.md` — shared vocabulary, first place to look up a term
- `CONTEXT.md` — deep definitions and invariants
- `docs/adr/` — numbered architecture decision records; `docs/decisions-log.md` — settled implemented decisions (one-liners)
- `docs/architecture/tech-stack.md` — framework/runtime rationale
- `docs/architecture/ports-and-adapters.md` — hexagonal architecture detail

**Recording a decision:** write a numbered ADR in `docs/adr/` only when the decision constrains not-yet-built work, or when reversing it would be catastrophic and non-obvious. Otherwise add a one-line entry to `docs/decisions-log.md`. `docs/` describes what exists today — anything forward-looking lives in the issue tracker, not here. Every ADR and reference doc leads with a plain-language `## Overview`; ADRs then split at a `---` into the precise detail below.

## Tech Stack

SvelteKit 2 + TypeScript (strict) · Bun · Tailwind CSS 4 · @sveltejs/adapter-static · Dexie/IndexedDB with `liveQuery` · Web Crypto (AES-256-GCM, PBKDF2) for the encrypted export blob · no backend · deployed as a static bundle rsynced to a VPS, served by Caddy.

## Directory Layout

`src/routes/` — SvelteKit pages + `/api/health`. `src/lib/` — `domain/` (pure logic + ports), `adapters/` (Dexie etc.), `data/` (seeds), `utils/`, `components/`, `crypto/`, `types/`, `strings/`+`config/` (presentation).

## Architecture Intent

Ports & Adapters (Hexagonal), applied to local I/O too, not just a remote backend. Pure logic in `lib/domain/`, interfaces in `lib/domain/ports/`, implementations in `lib/adapters/`. Detail: `docs/architecture/ports-and-adapters.md`.

## Commands

```bash
just dev          # Start Vite dev server
just build        # Type-check + build
just check        # Same as build
just health       # Check https://eczema.nofiat.me/ is up
```

Run `just` or `just help` for the full recipe list.

## Design System

**Read `DESIGN.md` before touching any UI component or page** — authoritative colors, typography, spacing, radius, component patterns. Don't deviate.

Prototypes in `docs/design/`: `redesign-prototype.html` (all screens, Esc toggles interactive mode), `components-showcase.html` (all `lib/components/`, synced via `<!-- sync with: ... -->` comments — **update it whenever a component changes**).

**Before adding UI:** check `src/lib/components/` for an existing match first. If the element isn't an obvious route-local singleton (appears on >1 screen, or is a recurring pattern), extract it as a component before use.

## Code Standards

TypeScript, naming, imports, error handling, Svelte 5, testing, security rules: `docs/architecture/code-standards.md`.

## Conventions

- UI text is Czech, never inline on domain records: `src/lib/strings/` (pure text) → `src/lib/config/` (+ visual tokens). Full split, examples, `satisfies` rule: `docs/architecture/code-standards.md`.
- Dates: Czech-style `5. 3.` (non-breaking space)
- Food categories seeded in `src/lib/data/categories.ts`

## Pull Request Workflow

All changes via PR, squash-merged. Direct pushes to `main` blocked. Title/description format, CI gates, commit rules, post-merge steps: `CONTRIBUTING.md`.

## When Modifying the Repo

After significant changes, check whether these still need updating:
1. `UBIQUITOUS_LANGUAGE.md` — new or renamed domain/UI/architecture terms
2. `CONTEXT.md` — vocabulary/invariants still match the code
3. `docs/adr/` — new decisions to record, or existing ones to revise
4. `docs/README.md` and this file — still accurate
5. `grep -rn "\$lib/" src/` — dead imports after deletes

**Term ownership rule:** any named concept used in more than one file (type, route label, component, phase name) needs an entry in `UBIQUITOUS_LANGUAGE.md`; a core domain invariant also needs a `CONTEXT.md` entry; an architectural decision also needs an ADR.

## Agent skills

### Issue tracker

GitHub Issues. External PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.
