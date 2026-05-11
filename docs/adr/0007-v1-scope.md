# 0007 — v1 scope is the Protocol Executor

**Status:** Accepted
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

In scope for v1:
- Onboarding questionnaire → `GeneratedSchedule`.
- Today view: current phase, eliminated allergens today, training
  reminders, daily skin assessment, photo capture, today's meal list.
- Meal-add flow with allergen-conflict detection against today's
  elimination set.
- Day detail (read-only review of a past day).
- Program view (phase timeline).
- End-of-reintro allergen-evaluation flow.
- Settings with encrypted export ([ADR-0002](0002-backup-floor.md))
  and restore.

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
