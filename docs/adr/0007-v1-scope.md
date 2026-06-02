# 0007 — v1 scope is the Protocol Executor

**Status:** Accepted — v1-alpha shipped (onboarding, today, meal, program, skin+photo). Three in-scope features remain: day-detail, end-of-reintro verdict, encrypted export/import. See [ADR-0008](0008-tracer-bullet-slices.md) slices 4–6.
**Date:** 2026-05-11

## Context

The prototype in `docs/design/redesign-prototype.html` contains ~20+
screens spanning three nested levels of value:

- **Daily logbook** — meals, skin assessments, photos, no protocol
  logic.
- **Protocol executor** — daily logbook + onboarding-driven schedule,
  phase-aware conflict detection on meal entry, end-of-reintro
  allergen verdict.
- **Pattern finder** — protocol executor + the derived insight engine
  from [ADR-0004](0004-causation-derived-not-recorded.md) that surfaces
  correlations like "after dairy days, skin worsened in 3 of 4 cases."

These nest. The question is where to draw the v1 ship line.

## Decision

**v1 = Protocol Executor.** The insight engine ships in v1.1 once we
have 2–3 weeks of real logs to develop it against.

In scope for v1 — **remaining work** (see [ADR-0008](0008-tracer-bullet-slices.md) slices 4–6 for the slice breakdown):

- ☐ **Day detail** (read-only review of a past day) — slice 4.
- ☐ **End-of-reintro allergen-evaluation flow** — slice 5. The program
  screen already renders an `evaluations` array, but nothing populates
  or persists it: there is no evaluations table, repository, or
  write path. The verdict cannot currently be recorded.
- ☐ **Settings: encrypted export + restore**
  ([ADR-0002](0002-backup-floor.md)) — slice 6. The Web Crypto helpers
  in `src/lib/crypto/` exist and are tested, but no export/import flow
  consumes them; settings only offers reset.

The rest of v1's in-scope features have shipped — see **Completed
(v1-alpha)** at the bottom of this file.

Out of scope for v1 (deferred):
- Insight cards / "Souvislosti" panel.
- Retest setup for previously-reactive allergens.
- Training-phase open-ended management UI (the domain logic in
  `src/lib/domain/schedule.ts` already supports it; the screens wait).
- Photo encryption-at-rest (per
  [ADR-0005](0005-photo-encryption-deferred.md)).
- Sync / multi-device (per [ADR-0001](0001-single-device-v1.md)).

## Why not smaller, why not bigger

- **Smaller (daily logbook only)** does not justify building a custom
  app over a Notes app plus the camera roll. The developer would not
  dogfood it long enough to test the real hypothesis (does the app
  help an elimination protocol succeed?).
- **Bigger (include the insight engine)** means designing pattern rules
  against synthetic data, then rewriting them once real logs reveal
  the rules do not match reality. The insight engine is a v1.1
  problem because it needs ground truth from a real run.

## Consequences

- The existing domain layer in `src/lib/domain/schedule.ts` covers
  ~80% of v1's logic. v1 work is mostly: persistence (Dexie adapter
  per [ADR-0006](0006-dexie-persistence.md)), screens translated from
  the prototype, and wiring.
- The end-of-reintro verdict screen ships without the
  "DOPORUČENO" auto-suggestion. Suggestion logic depends on the same
  pattern-detector primitives the insight engine needs; both are v1.1.
- v1 is dogfooded by the developer on their own device. Real protocol
  data from that run is the input to v1.1's insight rules.

## Completed (v1-alpha)

In-scope v1 features that have shipped end-to-end (domain → Dexie
adapter → store → screen), with the [ADR-0008](0008-tracer-bullet-slices.md)
slice that delivered each:

- ✅ **Onboarding questionnaire → `GeneratedSchedule`** — slice 1.
  6-step flow persists `answers`, runs `generateSchedule()`, persists
  `schedule`.
- ✅ **Today view** — slices 1 + 3. Current phase, eliminated/allowed
  allergens for the day, tolerance-building reminders
  (`getToleranceBuildingRemindersForDate()`), today's meal list, skin
  observation card, photo thumbnail grid.
- ✅ **Meal-add flow with conflict detection** — slice 2. mealType
  pills, category/sub-item selection, `detectConflicts()` against the
  day's elimination set. (Recents strip + sub-item search remain
  deferred per ADR-0008.)
- ✅ **Program view (phase timeline)** — phase timeline with progress,
  permanent eliminations, and retest add/cancel
  (`appendReTestPhases()` / `removeReTestPhase()`).

Persistence (Dexie schema v4: `answers`, `schedule`, `meals`,
`skin_observations`, `photos`), the ports/adapters layer, and the
reactive stores (`scheduleContext`, `mealSession`, `protocolSession`)
are all in place and consumed by the screens above.
