# Parked features

> **Frozen snapshot.** Describes `main` as of `27daefc`, 2026-07-29. Not maintained —
> verify against current `main` before reviving.

## Overview

The descaling to logging-only (PRD [#623](https://github.com/jirigrill/eczema-helper/issues/623))
stripped the elimination-protocol engine out of the live app, leaving a logging tool: first
run, day view, meal logging, skin observation with photos, settings. What was parked is the
whole protocol machinery — the generated elimination schedule and its phases, allergen
conflict-matching, the reintroduction dose-escalation ladder and its decision engine, the
end-of-phase verdicts, the onboarding questionnaire that seeded the schedule, and the
`/program` / `/week` / `/evaluation` routes that rendered it.

None of it was deleted outright. It lives, verbatim, in the annotated git tag
`parked/protocol-engine` at `27daefc`. This document is the **slicing index** over that tag:
which parked path, symbol and doc belongs to which parked feature, so a future reviver can
restore one capability without dragging in the rest.

## Reviving

The mechanical procedure, once, for every entry below:

- **Path entries** (`Code:` / `Docs:` lines _without_ a `§`) are restored straight out of
  the tag: `git checkout parked/protocol-engine -- <path>`. The file returns byte-identical
  to its pre-strip state.
- **`§` entries** (`schedule-builder.ts § addTrainingPhase`, `CONTEXT.md § "Ladder"`) are
  **not** path restores. The `§` marks a _fragment_ that was cut out of a file which has since
  kept living on `main` — a symbol inside a still-present module, or a section inside a
  still-present doc. Recovering one is **hand re-insertion**: read the fragment out of the tag
  (`git show parked/protocol-engine:<path>`) and splice it back into the evolved file, fixing
  up whatever moved around it. Never overwrite the whole live file to get a fragment back.
- **Dexie tables were left dormant, not dropped.** `answers`, `schedule`, `evaluations` and
  `ladder_overrides` still exist in `src/lib/db/atopic-db.ts` (their row types degraded to
  placeholders); the `db.version(...)` block was **not** touched and **no migration** ran, so
  any protocol data written by a pre-strip build is still on disk and readable once the row
  types are restored. Reviving is additive — restore the types and the code, and the old rows
  light up. Do not write a migration to "clean up" the dormant tables; that would orphan
  parked data.

## Dependency shape

```
        phases-schedule ──┬──> allergen-matching
              ▲           ├──> tolerance-building (ladder)
              │           ├──> reintroduction-evaluation
  onboarding-questionnaire└──> program-week-day-views
      (seeds the schedule)
```

## Base layers

<!-- Never revived alone — pulled in by a feature above. -->

### phases-schedule

**Purpose:** The generated elimination schedule and its phase model — the ordered
`SchedulePhase[]` (`reset → elimination → (reintroduction → rest)× → tolerance-building×`),
the per-date phase lookup, the eliminated-set derivation, and the `AllergenStatus` lifecycle
every other protocol feature reads. The spine the whole engine hangs off.
**Depends on:** —
**Code:** `domain/schedule-builder.ts`, `domain/schedule-queries.ts`, `domain/policy.ts`,
`domain/allergen-status.ts`, `domain/__fixtures__/schedule.ts`,
`domain/ports/schedule-repository.ts`, `adapters/dexie-schedule-repository.ts`,
`stores/schedule-context.ts`, `adapters/loggable-window-guard.ts`,
`components/ProgressBar.svelte`, `config/phases.ts`,
`strings/phases.ts`, `models.ts § SchedulePhase` / `§ GeneratedSchedule` / `§ PhaseType` /
`§ AllergenStatus` / `§ getPermanentEliminations`, `domain/day-view.ts § resolveDay`
**Docs:** `docs/adr/0016-verdict-drives-schedule-not-status.md`,
`docs/adr/0025-event-domain-model.md`,
`docs/adr/0027-dual-actor-mirrored-schedule.md`, `CONTEXT.md § "EliminationWindow"`,
`CONTEXT.md § "AllergenStatus"`, `UBIQUITOUS_LANGUAGE.md § "Protocol Phases"`,
`UBIQUITOUS_LANGUAGE.md § "Allergens & Elimination"` (minus the surviving Family/Allergen/Food
and Source-Subgroup entries), `UBIQUITOUS_LANGUAGE.md § "Schedule & Questionnaire"` (minus the
surviving Settings/session entries)
**Revive note:** —

## Parked features

<!-- In dependency order, nearest the base first. -->

### allergen-matching

**Purpose:** Conflict detection over a logged meal — resolving free-text and food
input to catalog allergens and flagging items that violate the day's eliminated set.
**Depends on:** phases-schedule
**Code:** `domain/allergen-matcher.ts`, `domain/ports/canonical-catalog-port.ts`,
`adapters/bundled-catalog-adapter.ts`, `components/AllergenChip.svelte`,
`components/AllergenDrillIn.svelte`
**Docs:** `CONTEXT.md § "CanonicalAllergen"`
**Revive note:** `normalizeKey` was moved into the live `harvest-candidate.ts` before
parking — restore the matcher without it.

### tolerance-building

**Purpose:** The dose-escalation ladder — the per-allergen rung model, the
reaction-aware `currentRung` derivation, and the deterministic `decideLadderMove`
decision engine with its gate precedence, probe/confirm mode, dwell and walk-down.
**Depends on:** phases-schedule
**Code:** `domain/ladder.ts`, `domain/ports/ladder-override-repository.ts`,
`adapters/dexie-ladder-override-repo.ts`, `stores/ladder-override-session.ts`,
`schedule-builder.ts § addTrainingPhase`,
`schedule-builder.ts § getToleranceBuildingRemindersForDate`,
`models.ts § ToleranceBuildingReminder`, `models.ts § ReintroductionDayInfo`,
`tools/ladder-viz/`
**Docs:** `docs/adr/0023-dose-escalation-ladder.md`, `CONTEXT.md § "Ladder"`,
`UBIQUITOUS_LANGUAGE.md § "Ladder / LadderStep / FeedingStage"`
**Revive note:** `tools/ladder-viz/` is a standalone dev inspector for the ladder engine
(imports `$lib/domain/ladder`), not part of the app bundle — revive it only if you need
to visualise the engine.
**Retained in the live tree:** the `Ladder` / `LadderStep` types in
`domain/canonical-allergen.ts` and the per-allergen ladder rows in
`data/allergen-catalog/allergen-catalog.ts` were **not** deleted, even though nothing
live reads them. They are hand-curated clinical data, expensive to reconstruct and
inert at runtime (data, not behaviour). A revival wires the engine back onto them
rather than re-authoring them.

### reintroduction-evaluation

**Purpose:** The end-of-phase verdict — the allergen-attributed `allergen-test`
outcome and the reflective `skin-status` record, the schedule mutation a reaction
drives (rest-phase insertion), and the retest machinery.
**Depends on:** phases-schedule
**Code:** `domain/ports/evaluation-repository.ts`,
`adapters/dexie-evaluation-repository.ts`, `stores/evaluations-store.ts`,
`routes/evaluation/+page.svelte`, `config/evaluation.ts`,
`schedule-builder.ts § applyReintroductionVerdict`,
`schedule-builder.ts § insertRestDays`, `schedule-builder.ts § appendReTestPhases`,
`schedule-builder.ts § removeReTestPhase`, `schedule-builder.ts § RetestRejection`,
`models.ts § ReintroductionEvaluation`, `models.ts § SkinEvaluationOutcome`
**Docs:** `docs/adr/0004-causation-derived-not-recorded.md`,
`docs/adr/0024-medical-scope-boundary.md`,
`docs/adr/0026-llm-schedule-proposer.md`, `CONTEXT.md § "ReintroductionEvaluation"`
**Revive note:** —

### program-week-day-views

**Purpose:** The protocol-facing screens — the `/program` timeline, the `/week`
overview, and the phase framing the day view carried (phase hero, allowed/avoid
reference, phase recap).
**Depends on:** phases-schedule
**Code:** `routes/program/+page.svelte`, `routes/week/+page.svelte`,
`domain/phase-recap.ts`, `components/PhaseBadge.svelte`,
`components/QuestionnaireSummaryRow.svelte`, `components/icons/CalendarIcon.svelte`,
`components/icons/TrendsIcon.svelte`
**Revive note:** —

### onboarding-questionnaire

**Purpose:** The multi-step first-run questionnaire that collected
`QuestionnaireAnswers` and generated the initial schedule — superseded on `main` by the
single feeding-stage picker.
**Depends on:** phases-schedule
**Code:** `domain/ports/questionnaire-repository.ts`,
`adapters/dexie-questionnaire-repository.ts`, `stores/protocol-session.ts`,
`models.ts § QuestionnaireAnswers`, `docs/allergen-reference/`
**Revive note:** `setFeedingStage` was relocated out of `protocol-session.ts` into the
live settings store before parking — do not restore it back.

## Index

<!-- Reverse view of the entries above, derived from them; on a discrepancy the entries win. -->

| Path                                                            | Owner                     |
| --------------------------------------------------------------- | ------------------------- |
| `domain/schedule-builder.ts`                                    | phases-schedule           |
| `domain/schedule-queries.ts`                                    | phases-schedule           |
| `domain/policy.ts`                                              | phases-schedule           |
| `domain/allergen-status.ts`                                     | phases-schedule           |
| `domain/__fixtures__/schedule.ts`                               | phases-schedule           |
| `domain/ports/schedule-repository.ts`                           | phases-schedule           |
| `adapters/dexie-schedule-repository.ts`                         | phases-schedule           |
| `adapters/loggable-window-guard.ts`                             | phases-schedule           |
| `stores/schedule-context.ts`                                    | phases-schedule           |
| `components/ProgressBar.svelte`                                 | phases-schedule           |
| `config/phases.ts`                                              | phases-schedule           |
| `strings/phases.ts`                                             | phases-schedule           |
| `models.ts § SchedulePhase`                                     | phases-schedule           |
| `models.ts § GeneratedSchedule`                                 | phases-schedule           |
| `models.ts § PhaseType`                                         | phases-schedule           |
| `models.ts § AllergenStatus`                                    | phases-schedule           |
| `models.ts § getPermanentEliminations`                          | phases-schedule           |
| `domain/day-view.ts § resolveDay`                               | phases-schedule           |
| `docs/adr/0016-verdict-drives-schedule-not-status.md`           | phases-schedule           |
| `docs/adr/0025-event-domain-model.md`                           | phases-schedule           |
| `docs/adr/0027-dual-actor-mirrored-schedule.md`                 | phases-schedule           |
| `CONTEXT.md § "EliminationWindow"`                              | phases-schedule           |
| `CONTEXT.md § "AllergenStatus"`                                 | phases-schedule           |
| `UBIQUITOUS_LANGUAGE.md § "Protocol Phases"`                    | phases-schedule           |
| `UBIQUITOUS_LANGUAGE.md § "Allergens & Elimination"`            | phases-schedule           |
| `UBIQUITOUS_LANGUAGE.md § "Schedule & Questionnaire"`           | phases-schedule           |
| `domain/allergen-matcher.ts`                                    | allergen-matching         |
| `domain/ports/canonical-catalog-port.ts`                        | allergen-matching         |
| `adapters/bundled-catalog-adapter.ts`                           | allergen-matching         |
| `components/AllergenChip.svelte`                                | allergen-matching         |
| `components/AllergenDrillIn.svelte`                             | allergen-matching         |
| `CONTEXT.md § "CanonicalAllergen"`                              | allergen-matching         |
| `domain/ladder.ts`                                              | tolerance-building        |
| `domain/ports/ladder-override-repository.ts`                    | tolerance-building        |
| `adapters/dexie-ladder-override-repo.ts`                        | tolerance-building        |
| `stores/ladder-override-session.ts`                             | tolerance-building        |
| `schedule-builder.ts § addTrainingPhase`                        | tolerance-building        |
| `schedule-builder.ts § getToleranceBuildingRemindersForDate`    | tolerance-building        |
| `models.ts § ToleranceBuildingReminder`                         | tolerance-building        |
| `models.ts § ReintroductionDayInfo`                             | tolerance-building        |
| `tools/ladder-viz/`                                             | tolerance-building        |
| `docs/adr/0023-dose-escalation-ladder.md`                       | tolerance-building        |
| `CONTEXT.md § "Ladder"`                                         | tolerance-building        |
| `UBIQUITOUS_LANGUAGE.md § "Ladder / LadderStep / FeedingStage"` | tolerance-building        |
| `domain/ports/evaluation-repository.ts`                         | reintroduction-evaluation |
| `adapters/dexie-evaluation-repository.ts`                       | reintroduction-evaluation |
| `stores/evaluations-store.ts`                                   | reintroduction-evaluation |
| `routes/evaluation/+page.svelte`                                | reintroduction-evaluation |
| `config/evaluation.ts`                                          | reintroduction-evaluation |
| `schedule-builder.ts § applyReintroductionVerdict`              | reintroduction-evaluation |
| `schedule-builder.ts § insertRestDays`                          | reintroduction-evaluation |
| `schedule-builder.ts § appendReTestPhases`                      | reintroduction-evaluation |
| `schedule-builder.ts § removeReTestPhase`                       | reintroduction-evaluation |
| `schedule-builder.ts § RetestRejection`                         | reintroduction-evaluation |
| `models.ts § ReintroductionEvaluation`                          | reintroduction-evaluation |
| `models.ts § SkinEvaluationOutcome`                             | reintroduction-evaluation |
| `docs/adr/0004-causation-derived-not-recorded.md`               | reintroduction-evaluation |
| `docs/adr/0024-medical-scope-boundary.md`                       | reintroduction-evaluation |
| `docs/adr/0026-llm-schedule-proposer.md`                        | reintroduction-evaluation |
| `CONTEXT.md § "ReintroductionEvaluation"`                       | reintroduction-evaluation |
| `routes/program/+page.svelte`                                   | program-week-day-views    |
| `routes/week/+page.svelte`                                      | program-week-day-views    |
| `domain/phase-recap.ts`                                         | program-week-day-views    |
| `components/PhaseBadge.svelte`                                  | program-week-day-views    |
| `components/QuestionnaireSummaryRow.svelte`                     | program-week-day-views    |
| `components/icons/CalendarIcon.svelte`                          | program-week-day-views    |
| `components/icons/TrendsIcon.svelte`                            | program-week-day-views    |
| `domain/ports/questionnaire-repository.ts`                      | onboarding-questionnaire  |
| `adapters/dexie-questionnaire-repository.ts`                    | onboarding-questionnaire  |
| `stores/protocol-session.ts`                                    | onboarding-questionnaire  |
| `models.ts § QuestionnaireAnswers`                              | onboarding-questionnaire  |
| `docs/allergen-reference/`                                      | onboarding-questionnaire  |
