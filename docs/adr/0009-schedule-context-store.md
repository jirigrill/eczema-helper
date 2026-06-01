# 0009 — Single ScheduleContext store as the UI data layer

**Status:** Accepted
**Date:** 2026-05-15

## Context

Routes needed `GeneratedSchedule` and `QuestionnaireAnswers` to render.
Two parallel data-access patterns had emerged:

- `today/+page.svelte` read `$scheduleStore` — a thin `liveQuery` wrapper
  exported from `$lib/stores/schedule.ts`.
- All other routes (`program`, `meal`, `settings`, `+page`) instantiated
  `new AtopicDb()` + both `DexieRepository` classes directly in `onMount`,
  loading data imperatively.

This meant four independent instantiation sites for the same two
repositories, and callers had to know which pattern applied where. Derived
protocol values (`eliminatedToday`, `reintroInfo`, `progress`) were
recomputed independently in each route from domain functions.

## Decision

A single `scheduleContext` store in `$lib/stores/schedule-context.ts`,
exported as a module singleton. It:

- Instantiates `AtopicDb`, `DexieScheduleRepository`, and
  `DexieQuestionnaireRepository` internally — one place in the codebase.
- Subscribes to both tables via `liveQuery`, so the UI stays reactive to
  any write.
- Computes all derived protocol state for today (`eliminatedToday`,
  `reintroInfo`, `progress`) internally and exposes them on the `ready`
  variant.
- Exposes a **discriminated union**: `loading | empty | ready`. Derived
  fields only exist on `ready` — no null checks needed in route templates.

All routes import `scheduleContext` and switch on its status. The previous
`schedule.ts` and `questionnaire.ts` stores are deleted.

## Why a discriminated union, not flat nullables

The codebase convention (CLAUDE.md) is discriminated unions for variants,
not optional fields. When `status === 'ready'`, TypeScript guarantees all
derived fields are present. Flat nullables would push defensive checks into
every route template.

## Why a module singleton, not SvelteKit context

`ScheduleContext` should always be alive — it is the app's only data
source, and there is no multi-instance concern on a single-device PWA.
Module-level singletons are the established pattern here. SvelteKit context
(`setContext`/`getContext`) adds ceremony without benefit for this shape.

## Why all derived state bundled, not split stores

The derived computations are cheap pure-function calls over an in-memory
object. A unified store shape means one interface to understand and one
import per route. The theoretical savings of split stores do not outweigh
the complexity cost.

## Consequences

- `$lib/stores/schedule.ts` and `$lib/stores/questionnaire.ts` are deleted.
- All routes import `scheduleContext` from `$lib/stores/schedule-context.ts`
  and switch on `status`.
- Repository instantiation is consolidated to one module; adding a new route
  requires no new instantiation code.
- Tests that need to exercise routes against different data states will mock
  the `schedule-context` module rather than injecting repositories directly.
  True DI via adapter injection is deferred — the real gain here was
  consolidation, not inversion of control.
- The `ready`-variant derivations were later extracted to a pure
  `buildScheduleContext()` in `schedule-queries.ts` (#166); the store became
  a thin shell over it. External interface unchanged. See
  [ADR-0015](0015-stores-as-imperative-shells.md).
