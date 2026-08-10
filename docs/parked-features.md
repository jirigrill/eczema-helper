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
  parked data. Each placeholder is listed as an `atopic-db.ts § …Row` entry on the feature
  that owns it — restoring it is the **first** step of that revival, because every port and
  adapter below it is typed against the real row shape and will not compile until it is back.

## Dependency shape

```
        phases-schedule ──┬──> allergen-matching
              ▲           ├──> tolerance-building (ladder)
              │           │         ┆ types only
              │           ├──> reintroduction-evaluation
  onboarding-questionnaire└──> program-week-day-views
      (seeds the schedule)
```

`daily-completeness` is **not** on this graph: it hangs off no base, was parked after the
protocol strip, and revives on its own.

Solid edges are value-level: the target does not compile without the source. The dashed edge
is type-level — `ladder.ts` type-imports two `models.ts` fragments that
reintroduction-evaluation owns, so restoring those fragments is enough and the verdict
feature itself stays parked.

**The features hanging off the base are not mutually independent.** The tree above is the
dependency on the _base_, not a partition. Their domain cores are separable, but the route
and store layers cross-reference — observed in the tag:

| Importer                                                     | Reaches into                                                                                                                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `routes/program/+page.svelte` (program-week-day-views)       | `stores/evaluations-store` (reintroduction-evaluation), `components/AllergenChip.svelte` (allergen-matching), `stores/protocol-session` (onboarding-questionnaire) |
| `routes/evaluation/+page.svelte` (reintroduction-evaluation) | `domain/phase-recap.ts` (program-week-day-views), `stores/protocol-session` (onboarding-questionnaire)                                                             |
| `stores/protocol-session.ts` (onboarding-questionnaire)      | `adapters/dexie-evaluation-repository` (reintroduction-evaluation)                                                                                                 |

So a single-feature revival is clean at the domain level and needs pruning at the UI level:
expect to restore a parked route with imports pointing at siblings you did not revive, and
to cut those branches by hand. Reviving a _domain_ slice — as the ladder does — does not hit
this.

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
`domain/ports/canonical-catalog-port.ts`, `adapters/bundled-catalog-adapter.ts`,
`components/ProgressBar.svelte`, `config/phases.ts`,
`strings/phases.ts`, `models.ts § SchedulePhase` / `§ GeneratedSchedule` / `§ PhaseType` /
`§ AllergenStatus` / `§ getPermanentEliminations`, `domain/day-view.ts § resolveDay`,
`atopic-db.ts § ScheduleRow`
**Docs:** `docs/adr/0016-verdict-drives-schedule-not-status.md`,
`docs/adr/0025-event-domain-model.md`,
`docs/adr/0027-dual-actor-mirrored-schedule.md`, `CONTEXT.md § "EliminationWindow"`,
`CONTEXT.md § "AllergenStatus"`, `UBIQUITOUS_LANGUAGE.md § "Protocol Phases"`,
`UBIQUITOUS_LANGUAGE.md § "Allergens & Elimination"` (minus the surviving Family/Allergen/Food
and Source-Subgroup entries), `UBIQUITOUS_LANGUAGE.md § "Schedule & Questionnaire"` (minus the
surviving Settings/session entries)
**Revive note:** `canonical-catalog-port.ts` / `bundled-catalog-adapter.ts` are the **shared
catalog seam**, not an allergen-matching detail: `schedule-builder.ts` and
`schedule-queries.ts` take the port as a constructor argument and `schedule-context.ts`
constructs the adapter, so the spine does not compile without them. They live here so that
reviving any single feature does not silently require allergen-matching too.

## Parked features

<!-- In dependency order, nearest the base first. -->

### allergen-matching

**Purpose:** Conflict detection over a logged meal — resolving free-text and food
input to catalog allergens and flagging items that violate the day's eliminated set.
**Depends on:** phases-schedule
**Code:** `domain/allergen-matcher.ts`, `components/AllergenChip.svelte`,
`components/AllergenDrillIn.svelte`, `components/FamilyDrillIn.svelte § eliminatedAllergenIds`,
`components/FoodTile.svelte § eliminatedStatus`,
`components/FoodEditor.svelte § eliminatedVariant`,
`strings/common.ts § meal.eliminatedChipLabel`, `strings/common.ts § meal.eliminatedTodayWarning`
**Docs:** `CONTEXT.md § "CanonicalAllergen"`
**Revive note:** `normalizeKey` was moved into the live `harvest-candidate.ts` before
parking — restore the matcher without it. The three `§` component fragments are the
red "Vyloučeno" treatment on a logged food: the `eliminatedAllergenIds` prop
`FamilyDrillIn` threaded down (plus its eliminated-group sink ordering), the `danger`
branches in `FoodTile`, and the red-eyebrow variant in `FoodEditor`. They outlived the
first strip as an unreachable surface — nothing live passed the prop — and were cut
afterwards. Reviving them needs a caller: whatever recomputes the day's eliminated set
has to pass it into `FamilyDrillIn` again. `Chip`'s `variant='danger'` was **not**
removed and is the styling hook `FoodEditor` used.

### tolerance-building

**Purpose:** The dose-escalation ladder — the per-allergen rung model, the
reaction-aware `currentRung` derivation, and the deterministic `decideLadderMove`
decision engine with its gate precedence, probe/confirm mode, dwell and walk-down.
**Depends on:** phases-schedule; reintroduction-evaluation (**types only** — see the revive note)
**Code:** `domain/ladder.ts`, `domain/ports/ladder-override-repository.ts`,
`adapters/dexie-ladder-override-repo.ts`, `stores/ladder-override-session.ts`,
`schedule-builder.ts § addTrainingPhase`,
`schedule-builder.ts § getToleranceBuildingRemindersForDate`,
`models.ts § ToleranceBuildingReminder`, `models.ts § ReintroductionDayInfo`,
`atopic-db.ts § LadderOverrideRow`, `tools/ladder-viz/`
**Docs:** `docs/adr/0023-dose-escalation-ladder.md`, `CONTEXT.md § "Ladder"`,
`UBIQUITOUS_LANGUAGE.md § "Ladder / LadderStep / FeedingStage"`
**Revive note:** `tools/ladder-viz/` is a standalone dev inspector for the ladder engine
(imports `$lib/domain/ladder`), not part of the app bundle — revive it only if you need
to visualise the engine.
`ladder.ts` type-imports `ReintroductionEvaluation` and `AllergenOutcome`, which
reintroduction-evaluation owns. The edge is **type-level only** — restoring those two
`models.ts` fragments is enough, and reviving the verdict feature itself is not required.
Nothing else on this list reaches into a sibling.
`ladder.ts` also imports `LadderAllergenId` from `models.ts`. That was a **re-export** of
the catalog's type, and only the re-export was dropped — the type is still derived live in
`data/allergen-catalog/allergen-catalog.ts`. Repoint the import rather than restoring a
`models.ts` fragment.
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
`models.ts § ReintroductionEvaluation`, `models.ts § SkinEvaluationOutcome`,
`models.ts § AllergenOutcome`, `atopic-db.ts § EvaluationRow`
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
`components/icons/TrendsIcon.svelte`, `strings/skin-regions.ts § severityCountSuffix`
**Revive note:** `severityCountSuffix` rendered the "× klidné" / "× mírné" count suffix in
`/program`'s skin recap. It survived the route's deletion with no caller and was cut
afterwards; the `severityStrings` labels it read are still live.

### onboarding-questionnaire

**Purpose:** The multi-step first-run questionnaire that collected
`QuestionnaireAnswers` and generated the initial schedule — superseded on `main` by the
single feeding-stage picker.
**Depends on:** phases-schedule
**Code:** `domain/ports/questionnaire-repository.ts`,
`adapters/dexie-questionnaire-repository.ts`, `stores/protocol-session.ts`,
`models.ts § QuestionnaireAnswers`, `atopic-db.ts § AnswersRow`, `docs/allergen-reference/`
**Revive note:** `setFeedingStage` was relocated out of `protocol-session.ts` into the
live settings store before parking — do not restore it back.

### daily-completeness

**Purpose:** The "did I log today?" signal, in both places it surfaced. (1) The today-only
nudge row at the top of the day view — the copy "Dnes ti chybí stav, foto a jídla." on the
left and an `n / 3` score on the right, one point each for a skin observation, a skin photo
and a meal with content. (2) The `DayStrip` today-cell dot, filled once the day had any
record (`todayRecorded = isToday && completeness > 0`) and hollow otherwise. A prompt, not a
record: it told the mother what today was still missing.
**Depends on:** —
**Code:** `domain/day-view.ts § dailyCompleteness`, `domain/day-view.ts § DailyRecords`,
`routes/day/[date]/+page.svelte § task-counter row`,
`routes/day/[date]/+page.svelte § todayRecorded`,
`strings/common.ts § today.counterHint`,
`components/DayStrip/DayStrip.svelte § todayRecorded`
**Docs:** `UBIQUITOUS_LANGUAGE.md § "Daily Completeness"`
**Revive note:** Parked **after** the protocol strip, so its fragments sit in the tag
inside files that have since changed a lot — restore by hand, never by path checkout.
`DayStrip` kept its today ring as a **purely visual** marker: the `todayRecorded` prop is
gone, today-selected collapsed into the ordinary selected-dot branch, and the ring renders
only when today is not the selected cell. A revival re-adds the prop, splits that branch
back in two, and must feed it from **today's own** records, not the selected day's — the
tag's `isToday && …` shape is a bug (the dot went hollow whenever the mother browsed a past
day), so restore the signal, not that gate. `docs/design/components-showcase.html`'s DayStrip
section documents the visual-only ring and needs updating in the same pass.

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
| `domain/ports/canonical-catalog-port.ts`                        | phases-schedule           |
| `adapters/bundled-catalog-adapter.ts`                           | phases-schedule           |
| `components/ProgressBar.svelte`                                 | phases-schedule           |
| `config/phases.ts`                                              | phases-schedule           |
| `strings/phases.ts`                                             | phases-schedule           |
| `models.ts § SchedulePhase`                                     | phases-schedule           |
| `models.ts § GeneratedSchedule`                                 | phases-schedule           |
| `models.ts § PhaseType`                                         | phases-schedule           |
| `models.ts § AllergenStatus`                                    | phases-schedule           |
| `models.ts § getPermanentEliminations`                          | phases-schedule           |
| `domain/day-view.ts § resolveDay`                               | phases-schedule           |
| `atopic-db.ts § ScheduleRow`                                    | phases-schedule           |
| `docs/adr/0016-verdict-drives-schedule-not-status.md`           | phases-schedule           |
| `docs/adr/0025-event-domain-model.md`                           | phases-schedule           |
| `docs/adr/0027-dual-actor-mirrored-schedule.md`                 | phases-schedule           |
| `CONTEXT.md § "EliminationWindow"`                              | phases-schedule           |
| `CONTEXT.md § "AllergenStatus"`                                 | phases-schedule           |
| `UBIQUITOUS_LANGUAGE.md § "Protocol Phases"`                    | phases-schedule           |
| `UBIQUITOUS_LANGUAGE.md § "Allergens & Elimination"`            | phases-schedule           |
| `UBIQUITOUS_LANGUAGE.md § "Schedule & Questionnaire"`           | phases-schedule           |
| `domain/allergen-matcher.ts`                                    | allergen-matching         |
| `components/AllergenChip.svelte`                                | allergen-matching         |
| `components/AllergenDrillIn.svelte`                             | allergen-matching         |
| `components/FamilyDrillIn.svelte § eliminatedAllergenIds`       | allergen-matching         |
| `components/FoodTile.svelte § eliminatedStatus`                 | allergen-matching         |
| `components/FoodEditor.svelte § eliminatedVariant`              | allergen-matching         |
| `strings/common.ts § meal.eliminatedChipLabel`                  | allergen-matching         |
| `strings/common.ts § meal.eliminatedTodayWarning`               | allergen-matching         |
| `CONTEXT.md § "CanonicalAllergen"`                              | allergen-matching         |
| `domain/ladder.ts`                                              | tolerance-building        |
| `domain/ports/ladder-override-repository.ts`                    | tolerance-building        |
| `adapters/dexie-ladder-override-repo.ts`                        | tolerance-building        |
| `stores/ladder-override-session.ts`                             | tolerance-building        |
| `schedule-builder.ts § addTrainingPhase`                        | tolerance-building        |
| `schedule-builder.ts § getToleranceBuildingRemindersForDate`    | tolerance-building        |
| `models.ts § ToleranceBuildingReminder`                         | tolerance-building        |
| `models.ts § ReintroductionDayInfo`                             | tolerance-building        |
| `atopic-db.ts § LadderOverrideRow`                              | tolerance-building        |
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
| `models.ts § AllergenOutcome`                                   | reintroduction-evaluation |
| `atopic-db.ts § EvaluationRow`                                  | reintroduction-evaluation |
| `docs/adr/0004-causation-derived-not-recorded.md`               | reintroduction-evaluation |
| `docs/adr/0024-medical-scope-boundary.md`                       | reintroduction-evaluation |
| `docs/adr/0026-llm-schedule-proposer.md`                        | reintroduction-evaluation |
| `CONTEXT.md § "ReintroductionEvaluation"`                       | reintroduction-evaluation |
| `routes/program/+page.svelte`                                   | program-week-day-views    |
| `routes/week/+page.svelte`                                      | program-week-day-views    |
| `domain/phase-recap.ts`                                         | program-week-day-views    |
| `components/PhaseBadge.svelte`                                  | program-week-day-views    |
| `strings/skin-regions.ts § severityCountSuffix`                 | program-week-day-views    |
| `components/QuestionnaireSummaryRow.svelte`                     | program-week-day-views    |
| `components/icons/CalendarIcon.svelte`                          | program-week-day-views    |
| `components/icons/TrendsIcon.svelte`                            | program-week-day-views    |
| `domain/ports/questionnaire-repository.ts`                      | onboarding-questionnaire  |
| `adapters/dexie-questionnaire-repository.ts`                    | onboarding-questionnaire  |
| `stores/protocol-session.ts`                                    | onboarding-questionnaire  |
| `models.ts § QuestionnaireAnswers`                              | onboarding-questionnaire  |
| `atopic-db.ts § AnswersRow`                                     | onboarding-questionnaire  |
| `docs/allergen-reference/`                                      | onboarding-questionnaire  |
| `domain/day-view.ts § dailyCompleteness`                        | daily-completeness        |
| `domain/day-view.ts § DailyRecords`                             | daily-completeness        |
| `routes/day/[date]/+page.svelte § task-counter row`             | daily-completeness        |
| `routes/day/[date]/+page.svelte § todayRecorded`                | daily-completeness        |
| `components/DayStrip/DayStrip.svelte § todayRecorded`           | daily-completeness        |
| `strings/common.ts § today.counterHint`                         | daily-completeness        |
| `UBIQUITOUS_LANGUAGE.md § "Daily Completeness"`                 | daily-completeness        |
