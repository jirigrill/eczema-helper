# ADR-0015 — Stores are imperative shells over pure cores

**Status:** Accepted
**Date:** 2026-06-01

## Context

Three stores have been built for the app's data seams:
`scheduleContext` (ADR-0009), `protocolSession`, and `mealSession` (#169).
Each store owns a reactive subscription (Dexie `liveQuery`) plus a mix of
side-effecting plumbing (subscription lifecycle, transient-empty guard, row
adaptation) and pure domain derivations (computed fields exposed on the
`ready` variant).

In early iterations the pure derivations lived inline inside the subscription
callback alongside the plumbing. This made the derivations untestable without
booting a live database — any assertion on a computed field (e.g. wrong
`eliminatedToday`) required seeding Dexie, subscribing, and polling with
timeouts.

## Decision

Stores follow the **functional core, imperative shell** pattern:

- **Pure core** — a named function (e.g. `buildScheduleContext`) that takes
  clean domain types and returns a plain object. No `db` import, no async,
  no side effects. Lives in `src/lib/domain/`.
- **Imperative shell** — the Svelte store in `src/lib/stores/`. Owns the
  `liveQuery` subscription, lifecycle states (`loading | empty | error`),
  row adaptation (stripping DB-specific fields like `SINGLETON_ID`), and
  the transient-empty guard. Calls the pure core and `set`s the result.

The store's public interface (discriminated union, import path) is
**unchanged by this split** — callers never see it.

## Why a named pure core, not inline code

Naming the pure function makes it an independently testable unit. A
wiring bug (wrong `today` passed to one derivation, a field assembled
from the wrong source) is caught by a synchronous plain-object test, not
an async integration test that spins up IndexedDB.

## Why the pure core lives in `domain/`, not `stores/`

Row stripping (peeling `id` / `SINGLETON_ID`) is DB→domain *adaptation* —
it belongs in the shell. The core must speak only domain types; importing
anything from `$lib/db/` into a domain module is the violation the split
prevents. The import-graph check is mechanical: after the split,
`schedule-queries.ts` has zero imports from `$lib/db/`.

## Why lifecycle states (`loading | empty | error`) stay in the shell

These states are entangled with timing-dependent shell concerns (the
transient-empty guard can only conclude `empty` after a re-query confirms
the data is gone). They are not properties the pure core can derive from
its inputs — they describe the *read lifecycle*, not the *domain snapshot*.
The pure core therefore returns only the `ready` payload (`ReadyContext`),
never the full union.

## Consequences

- Each store has a corresponding pure function in `src/lib/domain/`:
  `buildScheduleContext()` in `schedule-queries.ts` (#166).
- Domain tests for computed fields are synchronous and require no Dexie
  setup. Store tests cover only the guard and lifecycle transitions.
- Adding a new derived field for the Insight engine (v1.1) touches only
  the pure core + a unit test — never the subscription plumbing.
- The pattern is established as the house convention. New stores must
  follow it; deviations require an ADR update.

## Precedents

- `scheduleContext` / `buildScheduleContext` — ADR-0009, #166
- `mealSession` — #169
- `protocolSession` — existing (write operations + schedule read delegation)
