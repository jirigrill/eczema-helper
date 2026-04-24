# Eczema Tracker

Personal PWA for tracking a breastfed newborn's atopic eczema through elimination diet. Single-child, two-parent, Czech UI.

## Status

Prototype-first frontend. Backend, persistence, and AI features are not wired yet — will be re-authored against the prototype's domain when the UX stabilizes.

## Structure

- `src/routes/*` — prototype UI (app pages: `/`, `/program`, `/day`, `/meal`, `/settings`)
- `src/routes/api/health/+server.ts` — liveness probe for deployment
- `src/lib/domain/` — domain model (`models.ts`) and pure business logic (`schedule.ts`)
- `src/lib/data/` — seed data (food categories, reintroduction order)
- `src/lib/utils/` — generic utilities (date, uuid, error)
- `src/lib/components/` — UI components (prototype's CategoryGrid/EczemaCheck + kept generics)
- `src/lib/server/` — server-side infra kept for future backend (logger, env, postgres pool, bcrypt, rate-limit, validation, shutdown)
- `src/lib/crypto/` — AES-256-GCM encryption helpers (Web Crypto)
- `src/lib/types/` — shared type helpers (`Result<T, E>`)

## Design docs

- [tech-stack.md](architecture/tech-stack.md) — framework, runtime, deployment choices
- [ports-and-adapters.md](architecture/ports-and-adapters.md) — hexagonal architecture (intended shape for when backend returns)

## Commands

See root-level `AGENTS.md` (symlinked as `CLAUDE.md`) and run `just` for the available recipes.

## Follow-ups

- New ports + services against the prototype's domain (photo storage, auth, analysis) when backend re-wiring starts.
- First migration `001_*.sql` once the new schema is defined.
- Session validation in `hooks.server.ts` when auth returns.
