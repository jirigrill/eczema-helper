# 0016 — Reintroduction verdict drives the schedule, not the status

## Overview

At the end of testing a single allergen — say, egg — the mother records one verdict: did the baby tolerate it, or react? That verdict is the one thing that decides what happens next in the plan: a reaction inserts a recovery period and keeps the allergen out; tolerance lets the plan move on. The app never quietly decides this for her — the reaction is always the parent's recorded judgment, not a conclusion the app draws on its own from the daily logs.

The verdict is treated as a permanent historical fact: once saved it isn't edited, and nothing downstream is allowed to silently re-derive or overrule it. An allergen's current "status" (eliminated, testing, passed, reacted) isn't stored — it's *computed* from the sequence of phases the verdicts produced. So status follows from the plan, and the plan follows from the verdicts. Even when the app later gains the ability to *suggest* a verdict from the logs, that suggestion stays a proposal the mother confirms; turning it into an automatic decision would require deliberately changing this rule.

---

**Status:** Accepted (extended by [ADR-0026](0026-llm-schedule-proposer.md) — proposals inherit the audit-fact rule)
**Date:** 2026-06-08

> **Extension (ADR-0026, 2026-07-05):** the `proposals` table inherits this
> ADR's **audit-fact-never-read-by-derivation** rule — it is append-only, stores
> rejected proposals too, and no schedule derivation reads it (topology stays the
> truth). Storing an LLM-authored `rationale` is not a spine violation: the record
> is authoritative *as an audit fact about what the LLM proposed*, not as domain
> truth. Critically, the **reaction verdict stays parent-attributed**: a
> `derived-signal` from the engine (its read of meals + skin) yields a proposal the
> mother confirms, *never* an auto-verdict. Auto-evaluated verdicts — the engine
> confirming the verdict itself — would require a deliberate **revision of this
> ADR** (dropping the parent-attribution mandate) and are explicitly **out of
> scope for the initial proposer build**; the seam is merely built to allow the
> confirm step to become optional later.

## Context

The end-of-reintroduction verdict records
whether a reintroduced allergen was tolerated or provoked a
reaction. The `ReintroductionEvaluation` model already existed
(`src/lib/domain/models.ts`); the program timeline already rendered an
`evaluations` array. Nothing wrote it: the array was a permanently-empty
`$state([])`.

A question had to be settled before wiring it: **where does "this allergen
reacted" live?** Two sources competed.

- `getAllergenStatuses` (ADR-0012) already derives `passed` / `reacted`
  **purely from schedule topology** — an allergen is `reacted` iff the
  phase immediately following its reintroduction is a `rest` phase. The
  schedule is self-describing.
- The original slice-planning text said the verdict "feeds allergen status," which
  reads as: the stored `ReintroductionEvaluation` should *be* the source
  of truth for status.

These cannot both be authoritative. Compounding the question: the schedule
generator never pre-plans `rest` phases, and `insertRestDays` /
`addTrainingPhase` (the functions that add them) had **zero production
callers** — they were tested but unwired. So the verdict mechanism was the
missing wire, not a redesign.

## Decision

**The verdict is an immutable audit record. Recording a *reaction* mutates
the schedule (inserts a `rest` phase). Status stays topology-derived.**

`getAllergenStatuses` and the elimination query (`getProtocolEliminatedForDate`,
formerly `getEliminatedSlugsForDate`) are **not changed** by this ADR —
no new `evaluations` argument is threaded through the domain. The flow is:

1. The mother records a verdict on `/evaluation`. A
   `ReintroductionEvaluation` is always persisted (the audit fact, and the
   *only* place a reaction is attributed to an allergen).
2. If the outcome is any reaction (`mild` / `clear` / `severe`),
   `insertRestDays` is called for that phase and the schedule re-saved.
   `getAllergenStatuses` then reads `reacted` from the new topology, and
   later phases are already date-shifted.
3. If the outcome is `tolerated`, the schedule is untouched; status reads
   `passed` as before.

The evaluation record holds the four-way nuance
(`tolerated / mild-reaction / clear-reaction / severe-reaction`); the
schedule holds the binary consequence (rest / no rest). The record is the
*audit fact*; the schedule is the *projection* consumers read.

### Severity sets the rest duration, not permanence

Protocol allergens are **never permanently eliminated** by a reaction. Any
reaction inserts a `rest` whose length is keyed to severity — a stronger
reaction means a longer recovery gap before the protocol continues to the
next allergen. New tunable constants in `src/lib/domain/policy.ts`:

| Outcome | `REST_PHASE_DAYS_*` (initial) |
|---|---|
| `mild-reaction` | 3 |
| `clear-reaction` | 7 |
| `severe-reaction` | 14 |

These are starting values, expected to change with clinical use.

### Retest is manual, reusing the baby-confirmed path

A reacted protocol allergen is **eligible for a later retest** — there is
no terminal state for it. Rather than auto-scheduling a retest, Slice 5
**widens `appendReTestPhases`** (ADR-0012) to accept a `reacted` protocol
allergen in addition to a `permanent-baby` one. One retest mental model and
one code path serve both. The `already-cleared` acceptance rule is relaxed
accordingly: an id is rejected only when its latest verdict was clean
(`passed`), not merely because it is not `permanent-baby`.

Because each reintroduction attempt is a distinct phase with a distinct id
(`reintro-<allergen>` for the original, `retest-<allergen>-<startDate>` for
each retest), the latest-reintroduction-wins rule already routes status to
the most recent attempt, and the verdict for each attempt is recorded
independently (see below).

### Verdicts are write-once

Once saved, an evaluation is immutable; revisiting `/evaluation` for that
phase shows it read-only. This avoids building an inverse `removeRestDays`
mutation and the date-re-shift-under-already-logged-days problem that
editing would require. Editing a saved verdict is not supported.

### Storage: phase-keyed, one row per attempt

Dexie schema **v5** adds `evaluations: '&phaseId, date'`. `phaseId` is the
primary key — `ReintroductionEvaluation` carries no surrogate `id`. This
makes "one verdict per reintroduction attempt, immutable" a schema
guarantee rather than an application-code rule. Distinct phase ids mean the
original verdict and each retest verdict are separate rows; per-attempt
history is preserved and parallels latest-reintroduction-wins.

The new `evaluations` store is **display-only** and separate from
`scheduleContext` (ADR-0009): nothing reads evaluations to compute state,
so the core projection stays a pure function of `schedule + answers + date`.
A separate per-table store is the established pattern (`mealSession`,
`skinObservationSession`); folding evaluations into `scheduleContext` would
couple a fetched table into the projection every screen consumes, for no
status benefit.

## Why not make the evaluation the source of truth for status

The alternative — `getAllergenStatuses(schedule, evaluations, date)`
reading the stored verdict — was rejected because it is strictly more work
for no gain:

- A reaction must shift later phase dates regardless (the rest gap is a
  real timeline event). So the schedule must be mutated *either way*; a
  status-from-evaluation design cannot avoid it, only add to it.
- It would re-introduce a second source of truth that can drift from the
  schedule topology, exactly the inconsistency ADR-0012 unified away.
- It changes three core pure-function signatures, re-plumbs both context
  stores to thread evaluations, and forces `schedule-builder` (the pure
  generator) to read the evaluations table — a backward dependency.

Keeping status topology-derived means the well-tested ADR-0012 invariants
stand untouched and the schedule remains self-describing.

## Consequences

- `insertRestDays` and `appendReTestPhases` gain their first production
  callers. `addTrainingPhase` remains unwired (tolerance-building after a
  mild reaction is a later concern, not Slice 5).
- ADR-0012's `appendReTestPhases` acceptance rule is widened; its ADR text
  and tests are updated to admit `reacted` protocol allergens.
- A new route `/evaluation?phase=…&date=…&returnTo=…` follows the
  `/meal` + `/skin` pattern, reachable from the `/day` phase-hero tap and a
  contextual FAB action gated on `isPhaseEndForEvaluation`. Backfill of a
  missed evaluation day works through the same date-scoped path as late
  meal logging (Slice 4).
- The screen also evaluates `reset` / `elimination` phase ends with a
  `skin-status` verdict (`ReintroductionEvaluation.phaseType === 'skin-status'`),
  a pure record that does not mutate the schedule.
- IndexedDB schema bumps to v5. No upgrade hook — pre-launch, consistent
  with ADR-0012's reasoning; the only data is on the developer's machine.
- The "DOPORUČENO" auto-suggestion in the C.4 prototype is **omitted**
  (it needs the derived-insight engine, tracked in [#468](https://github.com/jirigrill/eczema-helper/issues/468)); the four outcome
  cards ship with nothing pre-selected.

### Known limitation

With write-once verdicts plus backfill, recording a *late* reaction shifts
later phase boundaries beneath any already-logged days. In practice the
blast radius is small — a verdict is recorded before the next allergen's
phase begins, so the shift lands on still-future phases, and meals are
date-keyed facts that do not move. Accepted; revisit if real use
surfaces a collision.
