# Descaling inventory — live vs. parked classification

> Research asset for wayfinder map #613 (Descale to logging-only), ticket #614.
> Feeds the parking-topology decision (#616), the catalog format, and the doc-stripping plan.
> **This is an inventory, not the final catalog.** It classifies every source file + doc as
> LIVE / PARKED / SEAM and clusters the parked code by feature.

## Boundary recap (locked on the map)

- **LIVE = pure logging:** meal logging (food/time/day/slot, no allergen/conflict analysis) +
  skin status logging with photos.
- **PARKED = the elimination-protocol engine** and everything depending on it.
- **SEAM = a LIVE file currently coupled to PARKED engine logic** — must be surgically decoupled.
- **Schema stays dormant** — no Dexie table drops; tolerance-training revives first and needs its data.

## The core of the strip (read this first)

Three engine anchors account for nearly every seam. Severing them *is* the descaling:

1. **`schedule-context.ts`** (`scheduleRaw` / `scheduleContext`) — imported by `+layout.svelte`,
   `meal/+page.svelte`, `skin/+page.svelte`, `day-view.svelte.ts`, and the parked screens.
   Removing it forces each seam's rework.
2. **`schedule-queries.ts`** (`buildScheduleContext`, `eliminatedFor`, `detectConflicts`,
   `getPhaseForDate`, `isPhaseEndForEvaluation`) — the allergen/phase surface pulled into the
   layout, day, meal, and day-view code.
3. **The loggable-window guard chain** — `dexie-meal-repository` + `dexie-skin-observation-repository`
   → `loggable-window-guard` → `schedule-repository` + `policy.isWithinLoggableWindow`.
   Cutting this one chain detaches both LIVE write-adapters from the schedule engine. Highest-value cut.

## Open product decision surfaced by the inventory

**Does logging keep the mother/baby actor split?** (`config/actors.ts`, `strings/actors.ts`,
`models.ts:Actor/getEligibleActors`, `SettingsData.feedingStage`, the feeding-stage picker.)
- If **yes**: actors + feedingStage stay LIVE, and `setFeedingStage` (currently living inside
  PARKED `protocol-session.ts`) must be relocated to a LIVE settings store.
- If **no** (single logger): actors/feedingStage/feeding-stages become PARKED — none of them touch
  the engine, so no severing either way, just removal.
This is a decision, not an inventory fact — tracked as its own ticket.

## LIVE — pure logging (kept as-is, zero engine coupling)

**Routes / stores:** `routes/+layout.ts`, `routes/day/[date]/+page.ts`,
`stores/day-strip-recentre.ts`, `stores/discard-buffer.ts`, `stores/harvest-candidate-session.ts`*,
`stores/meal-session.ts`, `stores/settings-context.ts`, `stores/skin-observation-session.ts`,
`stores/skin-photo-session.ts`.
(*`harvest-candidate-session.ts` flagged LIVE by routes-agent but its repo is PARKED — verify; likely PARKED.)

**Domain / adapters:** `domain/working-meal.ts`, `domain/meal-dirtiness.ts`,
`domain/preparation-rules.ts`, `domain/ports/meal-repository.ts`,
`domain/ports/skin-observation-repository.ts`, `domain/ports/skin-photo-store.ts`,
`adapters/dexie-skin-photo-store.ts`, `adapters/date-scoped-session.ts`,
`dailyCompleteness` half of `domain/day-view.ts`.

**Components:** `Button`, `BottomSheet`, `Chip`, `ConfirmSheet`, `DayCard`, `DayStrip/*`,
`FabActionSheet` (trim protocol actions), `FoodEditor`, `FoodTile`, `InfoBanner`, `MealCard`,
`PageHeader`, `PhotoLightbox`, `SkinObservationCard`, `SkinPhotoCard`, `SkinPhotoGallery`,
`Toast`, `error-alert`, `form-input`, most `icons/*`.

**Presentation:** `config/meals.ts`, `config/skin-regions.ts`, `strings/meals.ts`,
`strings/portions.ts`, `strings/preparations.ts`, `strings/skin-regions.ts`, `strings/common.ts`†,
`strings/actions.ts`†, `strings/index.ts`† (†MIXED — see SEAMS).

**Utils / infra:** `utils/date.ts`, `utils/day-query.ts`, `utils/index.ts`, `utils/share-photos.ts`,
`utils/uuid.ts`, `types/result.ts`, `crypto/encryption.ts` (photo encryption; only if photo sync kept),
`db/atopic-db.ts` (KEEP ALL tables — dormant, see below), `app.d.ts`, `hooks.server.ts`.

## SEAMS — LIVE files to surgically decouple

| File | Sever | Detail |
|---|---|---|
| `stores/meal-editor.svelte.ts` | `detectConflicts` from `schedule-queries`; `AllergenId`; `BundledCatalogAdapter` | Drop `eliminatedToday` field + `setEliminatedToday`/`eliminatedFoodIds`/`hasConflicts` getters + `eliminatedToday` params on `open`/`applyUndo`/`swapActor`. Yields a pure meal editor. |
| `stores/day-view.svelte.ts` | `buildScheduleContext`,`getPhaseForDate`; `scheduleRaw`; `BundledCatalogAdapter` | Remove `ctx`/`phase` deriveds+getters. `resolveDay` needs a LIVE "is-seeded/today" signal to replace `rawStore.current`. |
| `routes/+layout.svelte` | `schedule-context` + `schedule-queries` surface | Nav shell currently phase-aware; strip protocol nav/state. |
| `routes/day/[date]/+page.svelte` | `schedule-queries` (`getPhaseForDate` etc.) | Day view loses phase framing. |
| `routes/meal/+page.svelte` | `schedule-context`, `schedule-queries` | Meal screen loses conflict/eliminated UI. |
| `routes/skin/+page.svelte` | `scheduleRaw`; `policy.isWithinLoggableWindow` | Remove out-of-window `InfoBanner` (lines ~493-499) — the ONLY engine coupling here. |
| `routes/settings/+page.svelte` | `protocolSession` | Keep feeding-stage picker + reset, but relocate `setFeedingStage` to a LIVE store; re-point `reset()` to clear only meal/skin/settings. |
| `models.ts` | Split types | LIVE block (Meal*, Skin*, Photo*, Portion/Preparation, optionally Actor/FeedingStage) vs PARKED block (allergen/phase/evaluation/ladder/questionnaire types). `AppState` is itself a seam type. |
| `atopic-db.ts` | Type-only imports | Fix import paths if models split; DO NOT drop table declarations (dormant rows unreachable on revival otherwise). |
| `strings/common.ts` | Split keys | LIVE: `nav.today`, `fabSheet`(-addEvaluation), `today`(core), `meal`, `skin`, `zaznamyCs`/`snimkyCs`/`polozkaWordCs`. PARKED: `dayPreview`, `week`, `settings.reset*/feedingStage*`, `onboarding.*`, `program.*`, `evaluation.*`, + protocol builders. |
| `strings/actions.ts` | Split keys | LIVE: start/continue/back/add/save/cancel/close/done/edit/more/deleteMeal/copyMeal/confirmDelete/deleteObservation… PARKED: confirm/restart/saveWithConflict/editSchedule/noAllergy/evaluatePhase/startQuestionnaire/showDayOverview. |
| `strings/index.ts` | Barrel re-exports | Sever `phaseStrings`, `categoryStrings`, `subitemStrings`, `familySources`, `ostatniLabel` + protocol builders. Keep portion/meal/action/common. |

## PARKED — clustered by feature (with cross-dependencies)

Dependency shape is a **diamond, not a tree**: `allergen-engine` and `phases-schedule` are the
shared base; `tolerance-building`, `reintroduction+evaluation`, and `program-week-day-views` all
sit on top of both. This is the key input to the topology decision (#616) — per-feature branches
would duplicate or entangle the shared base.

```
            allergen-engine  ────┐
                                 ├──> tolerance-building (ladder)   [revives FIRST]
            phases-schedule  ────┤──> reintroduction + evaluation
                 ▲               └──> program-week-day-views
                 │
        onboarding-questionnaire (seeds phases-schedule)
```

### allergen-engine  (base layer)
Domain: `allergen-matcher.ts`, `canonical-allergen.ts`, `harvest-candidate.ts`,
`ports/canonical-catalog-port.ts`. Adapters: `bundled-catalog-adapter.ts`,
`dexie-harvest-candidate-repository.ts`. Data: `data/allergen-catalog/allergen-catalog.ts`,
`data/allergen-catalog/index.ts`. Config: `config/categories.ts`. Strings: `strings/categories.ts`,
`strings/families.ts`, `strings/family-sources.ts`. Components: `AllergenChip`, `AllergenDrillIn`,
`FamilyGrid`, `FamilyDrillIn`. Models: allergen-id types, `AllergenStatus*`.
Depends on: none (base).

### phases-schedule  (base layer)
Domain: `schedule-builder.ts`, `schedule-queries.ts`, `allergen-status.ts`,
`__fixtures__/schedule.ts`. Adapters/ports: `schedule-repository.ts`,
`dexie-schedule-repository.ts`, `loggable-window-guard.ts`, `policy.ts` (minus any LIVE buffer
symbols). Config: `config/phases.ts`. Strings: `strings/phases.ts`. Components: `PhaseBadge`,
`ProgressBar`. Models: `PhaseType`, `SchedulePhase`, `GeneratedSchedule`, `getPermanentEliminations`.
Depends on: allergen-engine.

### tolerance-building / ladder  ← REVIVES FIRST
Domain: `ladder.ts`. Ports/adapters: `ladder-override-repository.ts`, `dexie-ladder-override-repo.ts`.
Stores: `ladder-override-session.ts`. Models: `Ladder`, `LadderStep`, `Allergenicity`,
`ToleranceBuildingReminder`; `addTrainingPhase`/`getToleranceBuildingRemindersForDate` in
schedule-builder. Strings: `program.toleranceBuilding*` slice of common.ts, `phaseConfig/phaseStrings['tolerance-building']`.
Depends on: phases-schedule + allergen-engine. **Keep this cluster cleanly identifiable — it revives first.**

### reintroduction + evaluation
Domain: `phase-recap.ts`. Ports/adapters: `evaluation-repository.ts`, `dexie-evaluation-repository.ts`.
Stores: `evaluations-store.ts`. Route: `evaluation/+page.svelte`. Config: `config/evaluation.ts`.
Models: `ReintroductionEvaluation`, `AllergenOutcome`, `SkinEvaluationOutcome`, `ReintroductionDayInfo`.
Depends on: phases-schedule.

### program-week-day-views  (aggregate protocol views)
Routes: `program/+page.svelte`, `week/+page.svelte`. Domain: PARKED half of `day-view.ts`
(`resolveDay`/`DayViewCore` protocol parts), `buildScheduleContext`/`ReadyContext`/`getScheduleProgress`
in schedule-queries. Stores: `schedule-context.ts`. Icons: `CalendarIcon`(week tab), `TrendsIcon`.
Strings: `week.*`/`program.*` slices of common.ts.
Depends on: phases-schedule.

### onboarding-questionnaire
Route: `+page.svelte` (onboarding). Ports/adapters: `questionnaire-repository.ts`,
`dexie-questionnaire-repository.ts`. Stores: `protocol-session.ts` (also holds the LIVE `setFeedingStage`
to relocate). Config: `config/feeding-stages.ts`. Strings: `strings/feeding-stages.ts`,
`onboarding.*` slice of common.ts. Components: `QuestionnaireSummaryRow`.
Models: `QuestionnaireAnswers`, `EczemaSeverity`. Depends on: phases-schedule (seeds the schedule).

## Dormant Dexie tables (kept, unread by live app)

`answers`, `schedule`, `harvest_candidates`, `evaluations`, `ladder_overrides`, `settings`
(settings LIVE iff actor split kept). LIVE tables read/written: `meals`, `skin_observations`, `photos`.
**Do not drop any table declaration** — dropping a field without a migration makes dormant rows
unreachable on revival.

## Documentation classification

**LIVE docs (describe the logging app — keep on main):**
- `docs/adr/0001-single-device-v1.md` — foundational, still true.
- `docs/architecture/*` — tech-stack, ports-and-adapters, code-standards, testing-strategy.

**PARKED docs (protocol material — travel with the parked code):**
- ADRs `0004` (causation), `0016` (verdict-drives-schedule), `0023` (dose-escalation-ladder),
  `0025` (event model), `0026` (LLM schedule proposer), `0027` (dual-actor mirrored schedule).
- `docs/allergen-reference/*` (allergen taxonomy + elimination-diet schedule reference).
- Protocol sections of `UBIQUITOUS_LANGUAGE.md` and `CONTEXT.md` (phases, elimination window,
  reintroduction, tolerance-building, ladder). Doc-stripping detail is its own fog patch.

**Borderline (flag for decision):**
- `docs/adr/0024-medical-scope-boundary.md` — a safety boundary for free-text symptom input.
  Arguably still relevant to a logging app that accepts notes; revisit during doc-stripping.

## Caveats / verify-before-cut

- `harvest-candidate-session.ts`: routes-agent said LIVE, domain-agent parked its repo — reconcile
  (almost certainly PARKED with the harvest engine).
- `resolveDay` in `day-view.ts` needs a LIVE replacement signal for schedule status before its
  seam can close.
- Confirm no LIVE composer injects `CanonicalCatalogPort` before deleting the port/adapter.
