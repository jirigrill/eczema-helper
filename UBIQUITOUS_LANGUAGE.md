# Ubiquitous Language — Atopic Helper

Shared vocabulary for conversations between developer and AI about this codebase.
When either party uses a term listed here, it carries exactly this meaning.

**Maintenance rule:** when a term's meaning changes in code, update this file in the same PR.
Terms already defined in depth elsewhere are referenced, not duplicated.

---

## Protocol Phases

The elimination protocol is a fixed sequence of named phases. Each phase has a `type`
(`PhaseType`) and a date range. The sequence produced by `generateSchedule()` is:
Reset → Elimination → (Reintroduction → Rest)× → Tolerance-Building×

### Reset Phase
*Czech: Resetovací fáze*

5-7 day baseline period that opens the protocol. The mother eats normally (except confirmed
permanent eliminations) while the baby's baseline skin state is documented. No foods are
yet removed from the protocol list — this establishes the "before" reference.

### Elimination Phase
*Czech: Eliminační fáze*

Complete removal of all protocol allergens from the mother's diet. Duration: 14 days
(mild/moderate eczema) or 21 days (severe). Ends when skin has stabilised. The
`EliminationWindow` during this phase = permanent eliminations + all protocol allergens.

### Reintroduction Phase
*Czech: Fáze znovuzavedení / Reintrodukce*

A 3-4 day sequential test of one allergen at escalating doses (small → medium →
unrestricted → unrestricted) except milk alleren, which takes 5 days. One allergen
at a time, in the order defined by `testedAllergens`. The `EliminationWindow` 
opens an exception for the current allergen. Ends with a `ReintroductionEvaluation` 
verdict on day 3 or 4. → See `CONTEXT.md` for `ReintroductionEvaluation`.

### Rest Phase
*Czech: Klidový režim / Odpočinek*

3–7 day recovery after a reintroduction. Mother eats only tolerated foods. The presence
of a rest phase immediately following a reintro phase **signals a reaction** — the
allergen stays eliminated until re-tested. An allergen counts as **passed** only when
its reintro is *not* followed by a rest phase. → See `EliminationWindow` in `CONTEXT.md`.

### Tolerance-Building Phase
*Czech: Budování tolerance*

Open-ended maintenance phase (typically up to 3 months). The mother consumes a small
dose of a **tolerated** allergen twice weekly to build lasting tolerance. Multiple
tolerance-building phases may run concurrently (one per passed allergen). Has no fixed
end date. The `EliminationWindow` during a tolerance-building phase = same as the
concurrent non-tolerance-building phase, but the trained allergen is additionally
permitted in small doses. Phase type literal: `'tolerance-building'` (renamed from the
former `'training'` per ADR-0012). Icon: 🥄.

### ReintroductionDayInfo

Day-within-phase record returned by `getReintroductionDayInfo(schedule, date)` for
the active reintroduction phase. Contains: `dayInPhase`, `totalDays`, `allergenId`,
and `isEvaluationDay` (derived from `LadderStep.isEvaluationCheckpoint` at the
current rung — triggers the verdict UI). Carries **no Czech strings** — the
render site resolves the day's dose caption from the allergen's breastfed-stage
`LadderStep.dose` at index `dayInPhase - 1` (see [Ladder / LadderStep /
FeedingStage](#ladder--ladderstep--feedingstage)).

### Ladder / LadderStep / FeedingStage

The dose-escalation model — sole per-allergen dose-progression shape as of PRD
#421 PR B, per [ADR-0023](docs/adr/0023-dose-escalation-ladder.md).

- **`Ladder`** — `{ allergenId: string, stages: Partial<Record<FeedingStage,
  readonly LadderStep[]>> }` on the optional `ladder` field of a
  `CanonicalAllergen`. `allergenId` is typed `string`, not `LadderAllergenId`,
  to avoid a circular type (`LadderAllergenId` is inferred from the catalog the
  ladder lives inside).
- **`Allergenicity`** — `'low' | 'moderate' | 'high'`, the one authored input
  the derived *adaptation window* needs (ADR-0023 §6). It is an **intrinsic
  property of the allergen, not the dose progression**, so it lives on the
  optional `allergenicity` field of a `CanonicalAllergen` (not on `Ladder`),
  authored only where a `ladder` is present and paired with it by a catalog
  invariant test. The scale is **tunable curator policy, an ordinal placeholder
  — not a clinically stamped classification**. Order is meaningful, but only the
  `low` boundary is engine-load-bearing today: a `'low'` food is eligible for
  the decelerated-continuation window on a first-contact sub-threshold flare;
  anything higher routes straight to the reaction path. No engine consumes it
  yet — `deriveLadderState` will read it once PRD #454 lands. Authored in
  `allergen-catalog.ts`; `moderate`/`high` are grouped by rough reaction-risk
  convention and free to be re-graded.
- **`FeedingStage`** — `'breastfed' | 'mixed' | 'solids'`, mirroring the three
  table variants in the source protocols (Pekárková, Matoušková): "plně kojené
  dítě (bez příkrmů)" / "kojené dítě + příkrmy" / "dítě plně na příkrmech". Not
  every allergen has data for every stage. Beyond selecting a ladder's dose
  variant, it is the app's **live master switch**: stored in the `settings`
  singleton (see [SettingsData](#settingsdata--settingscontext)) and read by
  `getEligibleActors` to gate who may log a meal.
- **`LadderStep`** (a "rung") — `{ id: string, anchor: PortionKind,
  isEvaluationCheckpoint: boolean, dose: string }`. `anchor` reuses the shared
  `PortionKind` vocabulary; *order within the ladder*, not the anchor value
  alone, makes one step higher than another (anchors may repeat, e.g. dairy has
  three `package` rungs). `isEvaluationCheckpoint` gates the mother's verdict
  UI at that rung. `dose` is the Czech caption for that rung, **inlined on the
  domain record** — a deliberate deviation from ADR-0014 for this Czech-only
  single-tenant app (single-file catalog review beats a cross-file
  `strings/ladder.ts` lookup); see the ADR-0023 amendment.
- **`currentRung(allergenId, meals, steps)`** / **`nextLegalStep(rung, steps)`**
  (`src/lib/domain/ladder.ts`) — pure derivation, mirroring `AllergenStatus`:
  the rung is never persisted, and skipping a rung is impossible to express
  through the function signature. The caller resolves `ladder.stages[stage]`
  before passing `steps` in. `currentRung` is **reaction-aware** (PRD #445): a
  recorded reaction drops the live rung one step, so it means "highest rung
  logged **and not reacted-against**".
- **`decideLadderMove(input): LadderDecision`** (`src/lib/domain/ladder.ts`) —
  the deterministic ladder **decision engine** (PRD #445,
  [ADR-0023 §5](docs/adr/0023-dose-escalation-ladder.md#5-decision-engine-decideladdermove-prd-445)).
  Composes `currentRung` + the three gates into one per-allergen **verdict** for
  one moment; the F3 ≡ F4 walker (phase reduces to the injected `cadenceDays`).
  Decides but never writes. **`LadderDecision`** is the closed verdict union:
  `advance` · `hold` (reason `skin-worsening` / `cadence`) · `rest`
  · `passed` · `settled` · `blocked` · `ceiling-reached` (reason
  `floor-exhaustion` / `severe`). The escalation half of the clinical reshape is
  built (PRD #454 / [#500](https://github.com/jirigrill/eczema-helper/issues/500)):
  the engine derives a **probe/confirm mode** (see below), enforces
  `cadence ≥ latency` in confirm, and **dwells** at the top rung before emitting
  `settled`. The **walk-down** is built ([#501](https://github.com/jirigrill/eczema-helper/issues/501)):
  a confirmed reaction steps the ladder down one rung, caps the reacting rung
  forever (never re-climbed), and re-confirms the stepped-down rung via its own
  dwell; the lowest rung reacting is the `ceiling-reached { floor-exhaustion }`
  terminal. The v1 `step-back` variant and `MAX_RUNG_REACTIONS` are **retired**.
  The checkpoint verdict hold (`awaiting-verdict`) is also retired —
  `isEvaluationCheckpoint` survives only as a UI nudge. The reshape variants
  `adapting-decelerate` and `suspected-reaction` remain declared-but-unemitted
  scaffolding (later slices). See the ADR for the gate precedence and the
  reaction → walk-down → re-confirm state machine.
- **Probe / confirm mode** — the derived rhythm the ladder engine walks in
  ([ADR-0023 §6](docs/adr/0023-dose-escalation-ladder.md), PRD #454). **Probe**
  (before the first reaction) climbs fast — cadence 1 — to find roughly where a
  ceiling is. **Confirm** (once a reaction is seen, or the top rung is reached)
  slows to `cadence ≥ reactionLatencyDays` so a delayed reaction has time to
  surface before the next dose. Derived from replay state, never persisted; the
  engine still never branches on F3/F4 phase — only on mode + injected cadence.
- **Dwell** — the top-rung confirmation: hold the accepted dose constant and
  re-dose it `N = default-ladder step count` times at confirm cadence, with
  terminal evaluation at `last dose + reactionLatencyDays`. A clean probe
  confirms the **top rung only** (dose–response is monotone). Only once the
  dwell completes is the rung `settled` (a live maintenance state — "maintaining
  at this dose; may be re-challenged later"); before then the top reads `passed`.
- **`deriveLadderState`** — the *private*, single date-ordered replay of meals +
  evaluations behind both `currentRung` and `decideLadderMove`, so the
  reaction-binding + walk-down logic exists exactly once. Never exported.
- **`explainLadderMove(input): LadderExplain`** (`src/lib/domain/ladder.ts`) —
  the ladder engine's **trace/explain seam** (issue
  [#528](https://github.com/jirigrill/eczema-helper/issues/528), design #521): a
  pure surface returning `{ decision, snapshot, steps, replay }` so a consumer can
  see *why* `decideLadderMove` reached its verdict. Both functions share one
  internal `walkLadderPrecedence`, so the trace can never drift from the decision.
  The **`LadderStateSnapshot`** is a purpose-built public projection of the replay
  facts — six *verdict-facing* fields (`liveRung`, `atEffectiveTop`, `pendingRest`,
  `ceilingRung`, `mode`, `dwell`); `deriveLadderState`/`LadderReplayState` stay
  private. (The walk-down reshape, #501, retired the former `lastPassingRung`/
  `reactionCounts` bookkeeping fields — walk-down keeps no per-rung count and the
  stepped-down rung *is* the live rung.) `steps` is a fixed **6-tuple in precedence
  order**; each carries a `status` (`fired` = produced the verdict, `not-reached`
  after it, `passed-confirmed`/`passed-no-data` before) and, for the two
  gate-backed steps, the gate result paired with the effective, mode-adjusted
  threshold.
- **Replay trace** (**`LadderReplay`** = `{ initial, steps }`, `src/lib/domain/ladder.ts`)
  — the per-event trace of the private `deriveLadderState` loop, carried on
  `LadderExplain.replay` for the ladder-viz replay ledger. One **`LadderReplayStep`**
  per replayed event holds the event, the **`LadderReplayBranch`** the loop took
  (`climb`, `dwell`, `anchor-noop`, `tolerated-clear`, `reaction-walkdown`,
  `reaction-ceiling`, `reaction-noop`), and the loop's `before`/`after`
  **`LadderReplayFrame`**. Produced by instrumenting the *real* loop via an
  optional sink (no parallel replay); derived and non-load-bearing (ADR-0012). The
  last step's `after` equals the run's `LadderStateSnapshot` (minus `mode` and
  `atEffectiveTop`, both derived after the loop) by construction. The branch
  classification is emitted by the *domain*; the viz adapter only *labels* it —
  see the maintenance contract on `LadderReplayStep`.
- **Precedence steps** — the six ordered checks `walkLadderPrecedence` walks:
  **`permanent-or-empty`** (inert ladder → `blocked`), **`ceiling`** (terminal),
  **`reaction`** (rest — fires only while the recovery window is open),
  **`skin-worsening`** (skin-stability gate), **`cadence`** (spacing gate),
  **`advance-or-dwell`** (climb, or dwell/`settled` at the effective top). The
  first four are *structural* (a definite replay fact); the two gate-backed steps
  (`skin-worsening`, `cadence`) may be permissive for lack of data
  (`passed-no-data`).

---

## Allergens & Elimination

### Allergen / Allergen Slug
*Czech: Alergen*

A food trigger substance identified by a string slug (e.g. `'dairy'`, `'eggs'`,
`'wheat'`). Slugs are the stable IDs used in schedules, meals, and elimination windows.
The display name and icon are resolved from the slug at render time. The slug type is
`AllergenId`.

### AllergenId / LadderAllergenId / CustomAllergenId

The typed shape of an allergen slug. Per ADR-0017
these are **derived** from the data-first catalog rather than hand-written unions:

- `CatalogAllergenId = typeof ALLERGENS[number]['id']` — every canonical allergen slug
  in the bundled catalog (38 records as of PR #430's ladder expansion).
- `LadderAllergenId = Extract<typeof ALLERGENS[number], { ladder: object }>['id']`
  — the 22-record subset whose record carries a reintroduction `ladder`. Only
  allergens in this set can enter a reintroduction phase.
- `CustomAllergenId = \`other:${string}\`` — free-text allergen slugs the mother
  defines herself (e.g. `'other:Paprika'`). Participates in elimination logs, never
  enters a protocol phase. Unknown free-text input is also captured as a
  `HarvestCandidate` for eventual promotion into a `CanonicalAllergen`.
- `AllergenId = CatalogAllergenId | CustomAllergenId` — the union.

`AllergenId` is the unified type used at fields whose value can come from either
tier (`motherAllergies`, `babyConfirmedAllergies`,
`AllergenStatus.allergenId`).

Fields known by construction to be ladder-bearing are typed `LadderAllergenId`
directly (`SchedulePhase.allergenIds`, `testedAllergens`,
`ReintroductionDayInfo.allergenId`, `ToleranceBuildingReminder.allergenId`,
`DEFAULT_TESTED_ALLERGENS`). See ADR-0014 "Domain-key shapes" section.

### Family / Allergen / Food — three-level catalog
*Czech: Rodina / Alergen / Potravina. See
the CONTEXT.md "Family / Allergen / Food" entry for full definitions and
invariants.*

The catalog has three levels, each with a derived id:

- **Family** (`FamilyId`) — broad grid tile / log bucket (`Ovoce`, `Mléko`,
  `Vlastní`). Presentation only; no protocol, no clinical meaning.
- **Allergen** (`AllergenId`, with `LadderAllergenId` its ladder-bearing
  subset) — the reintroduction unit. Carries `ladder`; engine unchanged.
- **Food** (`FoodId`, with `CustomFoodId = other:${string}` its free-text tier) —
  first-class loggable entity carrying `familyId` (presentation) and
  `allergenIds` (its trigger set, many-to-many).

Two invariants (full text in CONTEXT.md): a food's **family is presentation, its
allergen is domain** (they may diverge — `sójové mléko` → family `Mléko`, allergen
`soy`); and the **questionnaire selects allergens, the meal log selects foods**.
Triggers are **resolved live** from the catalog, never snapshotted onto a
`MealItem`.

### Source Subgroup (`sourceGroup`) / Ostatní
*Czech: Zdroj / podskupina. See the
[decisions log](docs/decisions-log.md) (was ADR-0019) and the CONTEXT.md
"food-source subgroup" principle.*

A **second presentation axis** on a food, independent of `familyId` and
`allergenIds`. Optional `sourceGroup` key (e.g. `cow`, `plant`, `gluten`) clusters
foods *within a family* by the axis a mother thinks in (`Mléko` → Kravské · Ovčí ·
Kozí · Rostlinné). Labels are **per-family and ordered**, in `familySources`
(`src/lib/strings/family-sources.ts`); array order = render order. A family renders
**grouped only when it has ≥ 5 foods and an authored source structure**, else flat.
Foods with no `sourceGroup` fall into a trailing **Ostatní** bucket — presentation
catch-all with **no safety claim** (danger stays per-food). Replaces the former
`bez alergenu` section. Like `familyId`, source never enters conflict detection.

### Tested Allergens
*Czech: Sledované alergeny*

The ordered list of allergens the protocol will eliminate and then reintroduce
sequentially. Set during onboarding. Default order: `['soy', 'wheat', 'eggs', 'dairy']`
(least → most common trigger). Drives the reintroduction sequence in `generateSchedule()`.

### Permanent Mother Allergens
*Czech: Maminčiny alergeny*

Mother's own lifelong allergies, sourced from `answers.motherAllergies`. Stored on
`GeneratedSchedule.permanentMother`. Never enter a reintroduction phase and are never
offered for retest. Always in the `EliminationWindow`. Identity is immutable.

### Permanent Baby Allergens
*Czech: Potvrzené alergie miminka*

Baby's confirmed allergies from the questionnaire, sourced from
`answers.babyConfirmedAllergies`. Stored on `GeneratedSchedule.permanentBaby`.
Eliminated by default but **eligible for end-of-program retest** via
`appendReTestPhases`. Origin is immutable — an allergen that retests cleanly stays in
`permanentBaby` with `AllergenStatus = 'passed'`.

### Permanent Eliminations (aggregate)
*Czech: Trvale vyřazené alergeny*

The union of `permanentMother` and `permanentBaby`. Exposed as a free function
`getPermanentEliminations(schedule): string[]` — not stored as a field on
`GeneratedSchedule`. Used by day-view consumers that need "anything forbidden by
identity, regardless of origin."

### Protocol Allergens

The full set of allergens eliminated during the elimination phase. Extracted from the
schedule's elimination phase. Equals `testedAllergens` minus any already-permanent
eliminations (mother or baby). Disjoint from `permanentMother` and `permanentBaby` by
construction.

### AllergenStatus
→ Defined in `CONTEXT.md`. The per-allergen lifecycle state derived by
`getAllergenStatuses(schedule, date)` in `src/lib/domain/allergen-status.ts`. One entry
per allergen in the closed universe `permanentMother ∪ permanentBaby ∪ protocolMembers`.
Status values: `permanent-mother`, `permanent-baby`, `not-yet-tested`, `eliminated`,
`testing`, `passed`, `reacted`, `tolerance-building`. Carries an `origin: 'mother' |
'baby' | 'protocol'` field so identity survives status changes. See ADR-0012.

### EliminationWindow
→ Defined in `CONTEXT.md`. The set of allergens an actor may not eat on a given date.
The protocol portion is derived by `getProtocolEliminatedForDate(schedule, date)`; each
actor's full window combines it with that actor's permanent eliminations. The canonical
recombination is `eliminatedFor(ctx, actor)` — `[...protocolEliminated, ...permanentMother]`
for the mother, `[...protocolEliminated, ...permanentBaby]` for the baby — so the
"which permanent set for which actor" rule lives in one place. (Display-only "avoid
everything across both actors" views, e.g. the day view's *Vyhýbej se* list, merge all
three sets directly rather than through the per-actor helper.)

### Conflict Detection

Identifying `MealItem`s in a logged meal that violate the current `EliminationWindow`.
Performed by `detectConflicts(items, eliminatedSlugs, catalog)` over the actor's combined
eliminated set, returning the offending items. Its companion `conflictingAllergens(items,
eliminatedSlugs, catalog)` returns the distinct eliminated allergens those items trigger —
used to label the warning pills without re-walking the items. Surfaces a warning before the
user saves a meal.

### CanonicalAllergen / Canonical Catalog
→ Defined in `CONTEXT.md`. The curated, data-first catalog record for one
allergen (`id`, `icon`, `subitems`, `aliases`, optional `source`,
optional `protocol`, optional `ladder` — see [Ladder / LadderStep /
FeedingStage](#ladder--ladderstep--feedingstage) — and optional `allergenOrder`,
its position in Matoušková's 20-allergen testing sequence). The `ALLERGEN_CATALOG`
array of these records (in `src/lib/data/allergen-catalog/`) is the source of
truth from which `AllergenId` / `LadderAllergenId` are derived; it is sorted by
`allergenOrder`. Bundled, build-time, JSON-serializable, read through
`CanonicalCatalogPort`. See ADR-0017, ADR-0023.

### HarvestCandidate
→ Defined in `CONTEXT.md`. A runtime Dexie record for an unknown food the
mother typed: `normalizedKey`, `rawForms` (deduped surface forms),
`count`/`firstSeen`/`lastSeen`, and `status` (`pending | ingested`). The harvest
feed and eventual sync payload; graduates into a `CanonicalAllergen` by
curation. See ADR-0017.

### CanonicalCatalogPort
The port (hexagonal seam) through which the domain reads the allergen catalog.
The only adapter today returns the bundled `ALLERGEN_CATALOG`; a remote, server-pushed
adapter sits behind it (ADR-0017), so the catalog source stays swappable
without touching domain or UI.

### Normalized Key
The deterministic lowercase/trimmed/whitespace-collapsed form of a food name
used to dedupe `HarvestCandidate` rows and to match free-text input against a
`CanonicalAllergen`'s `aliases`. Precision-biased: diacritics are **kept** and
no stemming is applied on-device — authoritative cross-user clustering is out of
scope for the on-device catalog. See ADR-0017.

### Category / SubItem / SubitemId

*Retired. These types (`Category`, `SubItem`, `SubitemId`, `CATEGORIES`) were the
pre-ADR-0017 structural shape for food selection and are no longer in the codebase.*
The three-level catalog (Family / Allergen / Food) shipped and supersedes them; see
that entry above. `subitemStrings` in `$lib/strings/categories` remains as a
display-name lookup keyed by `FoodId`-shaped strings (`allergenId:subitem`) for
the catalog's food records — it is a strings table, not a type. See ADR-0017 and
ADR-0014.

---

## Schedule & Questionnaire

### QuestionnaireAnswers

The parent's intake data collected during onboarding:
- `babyBirthDate` — ISO date
- `eczemaSeverity` — `'mild' | 'moderate' | 'severe'`
- `motherAllergies` — allergen slugs (permanent eliminations)
- `babyConfirmedAllergies` — allergen slugs (permanent eliminations)
- `testedAllergens` — ordered protocol allergen list
- `programStartDate` — ISO date (defaults to today)
- `feedingStage` — the `FeedingStage` picked at onboarding; seeds the `SettingsData` master switch (see [SettingsData](#settingsdata--settingscontext))

Persisted to the `answers` table (via `QuestionnaireRepository`, or written directly
inside `startProtocol`'s onboarding transaction). Source of truth for `generateSchedule()`.

### GeneratedSchedule

The output of `generateSchedule(answers)`: an ordered array of `SchedulePhase` objects
with date ranges, plus `permanentMother`, `permanentBaby`, and `estimatedEndDate`.
Persisted by `ScheduleRepository`. Treated as immutable after generation — mutations
(`insertRestDays`, `appendTolerantBuildingPhase`, `appendReTestPhases`) produce a new
schedule object. The aggregate `permanentEliminations` is a derived free function, not
a stored field.

### ScheduleContext
→ Defined in `CONTEXT.md`. The reactive bundle of `GeneratedSchedule` +
`QuestionnaireAnswers` + derived protocol values consumed by all routes. Discriminated
union: `loading | empty | ready | error`. Its `ready` payload is `ReadyContext`,
produced by the pure `buildScheduleContext()` in `schedule-queries.ts`.

### ReadyContext
The eight-field payload carried by the `ready` arm of `ScheduleContext`: `schedule`,
`answers`, `allergenStatuses`, `protocolEliminated`, `permanentMother`, `permanentBaby`,
`reintroInfo`, `progress`. The three eliminated-set fields are kept **separate, never
pre-merged**, so each consumer combines them per actor (mother meal → protocol ∪
`permanentMother`; baby meal → protocol ∪ `permanentBaby`). Produced by
`buildScheduleContext(raw, today, catalog, feedingStage)` in
`src/lib/domain/schedule-queries.ts` — a pure projection with no DB dependency. The
`feedingStage` argument (from [SettingsData](#settingsdata--settingscontext)) picks
which ladder-stage variant `reintroInfo` resolves against.

### SettingsData / settingsContext

The user-controlled **live master switch(es)**, held in a dedicated `settings` Dexie
singleton row (keyed by `SINGLETON_ID`, mirroring `answers`/`schedule`). Today it holds
`feedingStage: FeedingStage`, with room for future settings. Deliberately **off**
`GeneratedSchedule` so retest/verdict rebuilds cannot overwrite it. Persisted by
`SettingsRepository` (port + `DexieSettingsRepository`); seeded from
`answers.feedingStage` inside the same onboarding-completion transaction as the schedule.
`settingsContext` (`src/lib/stores/settings-context.ts`) is the `liveQuery`-backed
reactive store consumers read for the live value; changed live from the Settings screen
via `protocolSession.setFeedingStage()`.

### SettingsRepository

The port (`src/lib/domain/ports/settings-repository.ts`) for persisting and loading
the `SettingsData` singleton — `save(settings)` / `load()`, both returning
`Result<…, string>`. Single implementation `DexieSettingsRepository`
(`src/lib/adapters/dexie-settings-repository.ts`), tested against `fake-indexeddb`.
Reached through `protocolSession` for writes and `settingsContext` for reactive reads;
routes never construct the adapter directly. Mirrors the `ScheduleRepository` /
`QuestionnaireRepository` shape.

### protocolSession

The unified module (`src/lib/stores/protocol-session.ts`) that owns **both** reads and
writes for the protocol seam. Exposes a `subscribe` function (delegating to
`scheduleContext`) plus write operations: `startProtocol(answers)`,
`appendReTests(slugs, today)`, `removeReTest(allergenId, today)`, `recordVerdict(eval)`,
`setFeedingStage(stage)`, `reset()`. Routes that mutate protocol state import
`protocolSession` instead of instantiating adapters directly. Routes that only read may
still import `scheduleContext`.

### skinObservationSession

The store module (`src/lib/stores/skin-observation-session.ts`) that is the **sole seam**
for reading and writing today's `SkinObservation` records. Shaped like `mealSession`:
a `readable<SkinObservation[]>` backed by `liveQuery` over today's rows, plus `save`
(compose), `update` (edit; `{ addPhotos, removePhotoIds }`), `remove` (delete by
`id`, cascades to photos), and `restore` (reinsert observation with preserved identity
after a `remove` — post-delete-undo path; ids and `createdAt` round-trip verbatim,
including photo ids) methods delegating to `DexieSkinObservationRepository`. It is
the only place that imports `db` and constructs the adapter for skin observations.
Routes subscribe to `$skinObservationSession` for reactive reads and call the verbs
on `skinObservationSession` for writes; they do not instantiate adapters directly.

A **date factory** pattern converts this (and `mealSession` /
`skinPhotoSession`) so `createSkinObservationSession(date)` returns
a `readable` scoped to that date — so the unified Day View can read any selected date while
`liveQuery` stays in the stores layer (ADR-0009 boundary rule). A `todayIso()`-bound instance remains the default for today-only callers.

### skinPhotoSession

The store module (`src/lib/stores/skin-photo-session.ts`) that is the **sole seam** for
reading a day's `SkinPhoto` records on `/day`. Shaped as a `readable<SkinPhoto[]>` backed
by a `liveQuery` that joins `skin_observations` (where date matches) with `photos`
(where `observationId` is one of the day's observation ids). Read-only — writes go
through `SkinObservationRepository.save(observation, photos)`, which inserts observation
plus photos atomically. Routes subscribe to `$skinPhotoSession` (or to the factory
`createSkinPhotoSession(date)` for a non-today date) for reactive reads; they do not
instantiate adapters or query Dexie directly.

### EczemaSeverity
*Czech: Závažnost ekzému*

Input from onboarding. One of: `'mild'` (Mírná) · `'moderate'` (Střední) · `'severe'`
(Těžká). Determines the duration of the elimination phase (14 vs. 21 days) and
influences rest phase lengths.

### ToleranceBuildingReminder

A notification generated by `getToleranceBuildingRemindersForDate(schedule, date)` when
a tolerance-building allergen has not been consumed in 3+ days — the threshold for
re-exposure. Not stored; computed on demand. (Renamed from `TrainingReminder` per
ADR-0012.)

### RetestRejection

The typed error returned by `appendReTestPhases(schedule, ids, today)` when one or more
ids cannot be retested. Discriminated union with three variants:
- `not-baby-confirmed` — id is a mother allergy or a protocol-only allergen.
- `already-cleared` — id is a baby allergy whose latest retest came back clean.
- `retest-already-scheduled` — a future retest phase for this id already exists.

Each variant carries `invalidIds: string[]` so the route can render specific Czech copy.
Defined next to its producer in `schedule-builder.ts`, not in `$lib/types/result.ts`.
See ADR-0012.

---

## Meals

### Meal
*Czech: Jídlo*

A record of food intake for one date+mealType+actor slot. Fields: `id`
(`MealId`), `date`, `mealType`, `items` (list of `MealItem`), `actor`
(`Actor` — `'mother' | 'baby'`, gated by the live `FeedingStage` via
`getEligibleActors`), optional `notes` (free-text observation), `createdAt`
(ISO datetime string — rendered as Czech `HH:MM` at display sites, never
stored formatted; see ADR-0014). Meals are day-granular — no user-facing time
of day. Both actors ride one mirrored schedule (see [Actor](#actor),
ADR-0027). → See ADR-0003.

### MealId
*Czech: —* (internal key, not user-visible)

Deterministic composite key for a `Meal`: `` `${date}:${mealType}:${actor}` ``
(e.g. `"2026-05-27:lunch:mother"`). Enforces the one-meal-per-slot-per-actor
invariant at both the type level and the Dexie unique index (`&id`): a
`(date, mealType)` pair can hold up to one meal per actor. Never a random UUID.

### MealType
*Czech: Typ jídla*

One of: `'breakfast'` (Snídaně) · `'lunch'` (Oběd) · `'snack'` (Svačina) ·
`'dinner'` (Večeře). Named type exported from `models.ts`. Czech labels and
icons resolved from `$lib/config/meals` (`mealConfig[type].label` / `.icon`).
See ADR-0014.

### MealItem
*Czech: Položka jídla*

A single food within a meal: `name`, `allergenId` (`AllergenId | null`),
optional `subitemId`, `amount` (`PortionKind`), optional `preparationMethod`
(`PreparationMethod`).

### PreparationMethod
*Czech: Způsob přípravy*

One of: `'raw'` (Syrové) · `'boiled'` (Vařené) · `'steamed'` (Dušené) ·
`'baked'` (Pečené) · `'fried'` (Smažené). Optional observational field on
`MealItem` — records how the food was prepared. Has no impact on allergen
conflict detection; stored purely for the mother's reference. Which chips a
food shows in the editor is gated by its catalog `FoodForm`.

### FoodForm
*Czech: Forma potraviny*

Closed 4-value catalog metadata on a `CatalogFood`: `'none'` (water, oil,
salt — no preparation row at all) · `'liquid'` (milk, drinkable — Syrové ·
Vařené · Pečené) · `'cookable'` (potato, meat, rice — all five chips) ·
`'raw-only'` (leafy salad, fresh fruit — Syrové only). The `formPreparations`
map (in `domain/preparation-rules.ts`) resolves a form to its chip subset. The
form is **never persisted** on a logged `MealItem`; `preparationMethod` stays
unconstrained on the persisted record.

### PortionKind
*Czech: Velikost porce*

One of: `'pinch'` (Špetka) · `'teaspoon'` (Lžička) · `'spoon'` (Lžíce) ·
`'portion'` (Porce) · `'package'` (Balení). The **meal-logging** portion size —
what the mother recorded eating on a `MealItem`. Distinct from a `LadderStep`,
which is the protocol-prescribed dosing instruction during reintroduction. See ADR-0014.

### Actor
The person whose food intake a `Meal` describes — `'mother' | 'baby'`, a named
type in `models.ts`. `getEligibleActors(stage)` gates who may log at the live
[FeedingStage](#ladder--ladderstep--feedingstage): `breastfed → [mother]`,
`mixed → [mother, baby]`, `solids → [baby]`. Every `Meal` carries its `actor`
in the composite `MealId` (`date:mealType:actor`).

### getEligibleActors
`getEligibleActors(stage: FeedingStage): Actor[]` in `models.ts` — the single
source for "who may log at this feeding stage". Returns `breastfed → [mother]`,
`mixed → [mother, baby]`, `solids → [baby]`. Read by the `/meal` route (drives
the [Actor Picker](#actor-picker) visibility and the implicit-actor snap) and
mirrored in prose by the [Actor](#actor) invariant. The mirrored-schedule
rationale (one protocol, two permanent-elimination sets) lives in
[ADR-0027](docs/adr/0027-dual-actor-mirrored-schedule.md).

### Actor Picker
*Czech labels: `Já` (mother) / `Miminko` (baby)*

The `/meal` control — a full-width `Chip.svelte` pill row pinned in the sticky
header — by which the mother chooses whose meal she is logging. Shown **only**
when more than one [Actor](#actor) is eligible (i.e. `mixed`); single-actor
stages render no picker and no label, the actor being implicit. Selecting a pill
re-opens the [MealEditor](#mealeditor) on that actor's slot; a **swap-on-dirty**
autosave (the meal-editor store's `swapActor`) persists the departing actor's
confirmed foods before the switch (issue #571).
→ See spec [issue #564](https://github.com/jirigrill/eczema-helper/issues/564)
and [issue #569](https://github.com/jirigrill/eczema-helper/issues/569).

### Working Meal / Working List
*Czech: Rozdělané jídlo*

The in-memory meal being built on `/meal` before it is finalized — the list of
**confirmed** foods plus the current `MealType`. Not a persisted `Meal`: it exists
only in component/store state until the **finalize CTA** (`Uložit`) writes it to Dexie.
See the **commit-gate** and PRD [issue #242](https://github.com/jirigrill/eczema-helper/issues/242).

### Commit-Gate
The persistence rule for `/meal`: **nothing is written to Dexie until the finalize CTA
(`Uložit`).** Drill-in confirmations and family commits mutate only the working list;
backing out discards it **only if it would lose unsaved work** — a non-empty draft, or a
*dirty* edit — guarded by **optimistic discard + undo**. A clean edit-back is silent.
→ See ADR-0018.

### MealEditor
*Czech: —* (internal module, not user-visible)

Runes module under `src/lib/stores/meal-editor.svelte.ts` that owns the meal
editing lifecycle from `open` to `finalize`: hydrates a `WorkingMeal` from Dexie
(or starts empty for a fresh slot), threads transitions through `update(fn)`,
captures the **load snapshot** for dirtiness, exposes `dirty` / `canFinalize` /
`finalizeKind` (`'edit'` | `'compose'`), and persists via an internally-created
`createMealSession`. The `/meal` route delegates load/save/dirty/finalize-state
to it; view state (drill-in, grid edit) and navigation stay in the route.
Mirrors `day-view.svelte.ts`, extended from read-only to read-write.
The pure snapshot/comparison logic (`snapshotOf`, `snapshotsEqual`, `MealSnapshot`)
lives in `src/lib/domain/meal-dirtiness.ts`; `MealEditor` imports it.
→ See PRD [issue #284](https://github.com/jirigrill/eczema-helper/issues/284) and ADR-0018.

### Active Edit Slot
The invariant that **at most one food is in the `editing` state per screen.**
Entering editing locks (greys, disables) every other food tile and the family
grid; confirming or discarding releases the slot. Drives the save button's label, one
uniform `Uložit {what}` ladder (food editing → "Uložit {Food}"; family idle → "Uložit
{Family}"; meal finalize → "Uložit {MealType}" composing, "Uložit změny" editing).

### Confirm / Discard (a food)
*Czech: Uložit / Zahodit*

**Confirm** ("Uložit {Food}") moves a food `editing → confirmed` (bordeaux fill),
collapsing its `FoodEditor`. **Discard** (re-tap the editing tile, or tap outside
the editor) returns it to `idle`, storing nothing. The working session caches
**last-confirmed** amount/prep per food — de-selecting a confirmed food keeps the
cache for re-selection; discarding an unconfirmed edit does not.

### Fixed-at-Entry (meal type)
Meal type is chosen **before any food is added** and is **fixed** for that composing
session — `/meal` composes exactly one meal of one type. There is no mid-add type
change and no in-`/meal` slot switching. Because type is bound at entry, a draft and a
finalized meal can never contend for one slot, so slot collisions are impossible *by
construction*. → See ADR-0018. (Supersedes the earlier *mutable-attribute* model with
**Move** / **Switch-Away** pill actions.)

### Meal-Type FAB Submenu / Meal Launcher
The day-page entry into `/meal`. The **FAB** opens a submenu of the four `MealType`s;
an already-logged type carries a ✓ and **edits** that meal, an unlogged type opens an
**empty** compose session. **Tapping a finalized meal row** (`MealCard`) opens it for
editing. Both routes land on the same `/meal?type=X&date=…&returnTo=…` loaded state.
The FAB is **day-scoped** (bound to the day page's `selectedDate`), so backfilling an
earlier day works. → See ADR-0018.

### Smazat jídlo (delete a meal)
Explicit destructive action on `/meal` in **edit mode only**. Surfaced behind the ⋯
overflow in the page header → confirm bottom sheet. Confirming calls
`mealRepository.remove(date, mealType)`, snapshots the working meal into the
`discardBuffer`, and navigates to `returnTo`; the layout's **discard toast** offers
`Zpět` (undo) and reads `Jídlo smazáno`. Undo rehydrates the working list from the
snapshot — re-tapping the finalize CTA (`Uložit`) then re-persists a fresh copy. Hidden
while composing a brand-new meal (nothing to delete). → See ADR-0018, issue #268.

### Discard Toast
The layout-level `Toast` (with `Zpět` undo) shown after the working meal is buffered to
`discardBuffer`. Its wording is keyed by the buffer's `kind` so it stays accurate to what
was actually lost: **`Jídlo neuloženo`** (compose-new draft), **`Změny neuloženy`** (dirty
edit — the saved meal stays, only the edits drop), **`Jídlo smazáno`** (delete). A *clean*
edit-back shows no toast. → See ADR-0018 "Discard guard".

### Empty-meal Guard
Finalizing a zero-food working list is a **no-op** by construction. While composing a
new meal, the disabled CTA carries the message implicitly. While editing an existing
meal whose foods have been ✕'d to zero, an inline hint near the CTA tells the user to
use **Smazat jídlo** instead — closing the loophole where "empty then save" could
have been a hidden delete path. (Formerly "Empty-Hotovo Guard"; renamed with the
`Hotovo → Uložit` relabel.) → See issue #268.

---

## Assessment & Observation

### SkinObservation
→ Defined in `CONTEXT.md`. The parent's observation of the baby's skin on a calendar
day: `id`, `date`, `createdAt`, `regions: SkinRegionRecord[]`, optional `notes`.
**`regions.length === 9` after every save** (ADR-0021, klidné amendment) — klidné regions persist as
positive evidence, not absence. Multiple `SkinObservation` records may exist for
the same day. `SkinPhoto` records FK *to* `SkinObservation` via `observationId`;
`SkinObservationRepository.save(observation, photos)` writes the observation and
its photos atomically.

### SkinPhoto
→ Defined in `CONTEXT.md`. A photo of the baby's skin captured during a skin
observation: `id`, `observationId` (required FK to `SkinObservation`), `region: RegionId`,
`capturedAt`, `blob` (Blob stored in IndexedDB). Photos have no `date` field of their own
— the day is the date of the parent observation. Writes go through
`SkinObservationRepository.save(observation, photos)`, which inserts observation + photos
atomically; there is no standalone photo write path.

### Region / RegionId
*Czech: Oblast*

→ Defined in `CONTEXT.md`. One of nine canonical body areas the parent can log on
`/skin`: `face` (Tváře), `scalp` (Vlasová část), `neck` (Krk), `belly` (Břicho),
`back` (Záda), `arms` (Paže), `elbow-folds` (Loketní jamky), `knee-folds`
(Podkolení), `legs` (Nohy). `RegionId` is the canonical kebab-case slug; Czech
display labels live in `src/lib/strings/skin-regions.ts`.

### RegionLevel
*Czech: Míra*

→ Defined in `CONTEXT.md`. Per-region severity on a four-step absolute scale:
`0` klidné · `1` mírné · `2` střední · `3` silné. Klidné is the explicit default —
a region the parent never touched is calm, not unknown. See ADR-0021.

### SkinRegionRecord
The pair `{ id: RegionId; level: RegionLevel }` stored in `SkinObservation.regions`.

### Active region
On `/skin`, the region currently selected for tap-to-cycle. Tapping an inactive
region only activates it; tapping the active region cycles its severity 0 → 1 → 2
→ 3 → 0. UI-only — never persisted.

### Logged region
*Historical term, retired by the klidné-as-positive-evidence amendment to ADR-0021 (originally filed as ADR-0022).* The Uložit gate on `/skin` no longer requires
"at least one region with `level > 0`" — every page visit can save, and every save
witnesses all nine regions. A region with `level > 0` is now called a *bumped region*;
the term "logged region" is no longer used in code or copy.

### Day-overall severity
The maximum `RegionLevel` across an observation's `regions`. Computed via
`overallSeverity(observation)` from `$lib/domain/models`. Never persisted —
the read-side derives it at every render site that needs a single-value
collapse (week strip, /program phase recap, evaluation recap). The
SkinObservationCard on `/day` does **not** use this collapse — it renders one
chip per bumped region (per ADR-0021, severity is regional, not row-level),
so an observation with multiple severities reads honestly. A klidné
observation (zero bumped regions) renders a neutral "Vše klidné" chip — UI
copy keyed at `commonStrings.today.eczemaAllCalmChip`.

### ReintroductionEvaluation
→ Defined in `CONTEXT.md`. The allergen-attributed verdict at the end of a
reintroduction phase. The only place causation is explicitly recorded.

### AllergenOutcome

The four possible verdicts in a `ReintroductionEvaluation` when
`phaseType: 'allergen-test'`: `'tolerated'` (Toleruje) ·
`'mild-reaction'` (Mírná reakce) · `'clear-reaction'` (Jasná reakce) ·
`'severe-reaction'` (Silná reakce).

### SkinEvaluationOutcome

The four possible verdicts in a `ReintroductionEvaluation` when
`phaseType: 'skin-status'` (end-of-phase verdict for `reset` and
`elimination` phases): `'improved'` (Zlepšilo se) · `'unchanged'`
(Beze změny) · `'worsened'` (Zhoršilo se) · `'new-lesions'` (Nové
ložisko). A pure record; per [ADR-0016](docs/adr/0016-verdict-drives-schedule-not-status.md)
it changes no schedule and no status.

### Insight
→ Defined in `CONTEXT.md`. A derived pattern card computed over `(Meal, SkinObservation)`
pairs. Not user input. Not built (tracked in [#468](https://github.com/jirigrill/eczema-helper/issues/468)).

---

## UI Screens

Route names and their Czech display labels:

| Route | Czech label | Purpose |
|-------|-------------|---------|
| `/` | Průvodce / Nastavení | Onboarding questionnaire (6 steps) |
| `/day/[date]` | Den / Dnes | Day View: the one day layout for any date (see below). Replaces the former `/today` route |
| `/week` | Týden | Weekly overview: insights, photo gallery |
| `/program` | Postup | Full protocol timeline with phase details |
| `/meal` | Přidat jídlo | Meal logging form |
| `/settings` | Nastavení | App configuration |

### Onboarding
*Czech: Průvodce*

The 6-step questionnaire that collects `QuestionnaireAnswers` and generates the initial
`GeneratedSchedule`. Steps: baby birth date → eczema severity → mother allergies →
baby confirmed allergies → program start date → summary.

### Day View (Den / Dnes)

The single day layout, rendered for any date by `/day/[date]`. **Today** is just the
instance where the selected date equals `todayIso()`; there is no separate past-day
design. Contains: `DayStrip`, phase hero, the allowed/avoid reference, the three record
cards (skin status, photos, meals), and an add affordance (the FAB). The mother reaches
past days by scrolling the `DayStrip` and tapping a cell; she can backfill or edit those
days to the same parity as today (meals overwrite per slot; skin observations and photos
add-only — no delete yet). Return-to-today is the bottom-nav `Dnes` tab. **Action-prompt
chrome** — tolerance-building reminders and the task counter — renders only when the
selected date is today; past days show historical facts only.
The data path is reactive per selected date (`buildScheduleContext(raw, selectedDate)` +
date-scoped session-store factories), see ADR-0009's
Slice-4 amendment. The main screen a user opens each day.

### Daily Completeness

The 0-3 score shown in today's task-counter row, derived live from the day's records:
one point each for at least one `SkinObservation`, at least one `SkinPhoto`, and at
least one `Meal` with content (≥1 `MealItem` or non-empty `notes`). An empty meal slot
does not count. Computed by `dailyCompleteness` in `src/lib/domain/day-view.ts`.

### Program Screen (Postup)

Read-only timeline of all protocol phases. Shows phase dates, current position,
`PermanentEliminations`, reintroduction instructions, and re-test options.

---

## UI Patterns & Components

### Snippet

A Svelte 5 `{#snippet}` block — a named, reusable chunk of template markup scoped to a single file. Distinct from a *component* (its own `.svelte` file, importable, independently testable). Snippet props (`children`, `right`, `action`) are the mechanism for injecting varying markup into a component shell from the outside.

### ConfirmSheet

A bottom-sheet component (`src/lib/components/ConfirmSheet.svelte`) for destructive confirmation: shaded backdrop + sheet panel with a heading, body copy, a primary action button (typically `bg-primary`, sometimes `bg-danger` via the `confirmVariant` prop), and a secondary cancel button. Used by `/meal` (delete a meal) and `/skin` (delete an observation). Extracted from `/meal`'s previously-inline sheet per the CLAUDE.md "second use triggers extraction" rule when `/skin` edit/delete shipped (2026-06-30). Caller controls open/close state and supplies copy + handlers as props.

### DayStrip
*Czech: Pásek dní*

A horizontally scrollable, **continuous** strip of day cells covering a small buffer
before `programStart` through `estimatedEnd` plus a small buffer. Selecting a day flags
it **in place** — the strip does not reshuffle around the selection. **Today** carries a
permanent ring marker in its own slot, with a hollow centre dot when today is not yet
recorded and a filled dot once it is. There is no "Dnes" pill and no in-strip
return-to-today control — return-to-today is the bottom-nav `Dnes` tab. Days **before**
`programStart` are dimmed but remain selectable (no jump-to-today intercept). Future
cells render faded. Each cell shows: uppercase 2-char day abbreviation (`Po`, `Út` …),
day number, and a `SeverityDot`. The selected cell is highlighted in the primary color.

### SeverityDot
*Czech: Puntík závažnosti*

A 6×6 px color-coded circle on a `DayStrip` cell indicating the baby's recorded skin
state for that day. Color maps to the 5-point severity scale (`sev-1` green → `sev-5`
red). Empty if no assessment recorded.

### ProgressStrip
*Czech: Pruh pokroku*

Inline meta line showing `phase name · day N / total` plus a 4 px progress bar.
Appears on the Today and Week screens. Driven by `getScheduleProgress()`.

### PhaseBadge

Component that renders a colored badge for a `PhaseType`. Color and label are
mapped by `getPhaseDisplay()`: Reset (gray) · Eliminace (danger) · Reintrodukce (teal)
· Odpočinek (warning) · Trénink (success).

### EczemaCheck *(removed)*

Replaced in slice 1 of the regional severity redesign (issue #361, ADR-0021)
by an inline implementation in `src/routes/skin/+page.svelte`: a 3×3 region
grid using `RegionId` and `RegionLevel`, an optional note, and a gated
Uložit button. The standalone component, its tests, and the
`reintroductionAllergenId` reintro-context pill are gone — `/skin` is its
only consumer and the redesign moved the reintroduction context to
`/day` and `/meal`.

### AllergenChip

A self-contained pill chip that renders a single allergen as icon + name with full
pill chrome (rounded-full border, semantic background). Resolves `other:` prefixed
slugs (custom allergens) to a deterministic icon via hash. Props: `slug`,
`color?: 'neutral' | 'warning' | 'success'` (defaults to `'neutral'`). Color maps
to the DESIGN.md `chip-neutral` / `chip-warning` / `chip-success` tokens via
`data-state` in `app.css`. To render a list of chips, inline a `flex flex-wrap gap-1.5`
container with `{#each}` — there is no separate group component.

### EmptyStateCard

Dashed-border card shown when data for a section is missing (no meal logged, no
assessment recorded). Signals actionable absence, not an error.

---

### QuestionnaireSummaryRow

A single-field read/edit row used in the onboarding summary step (ONB 6). Displays
one `label` (uppercase, small) and one `value` (bold). Renders as a tappable `button`
with an inline "Upravit ›" affordance when `onEdit` is provided; as a plain `div`
when read-only. Distinct from `DayCard` (today-screen data cards).

### FoodTile

The selectable food tile on `/meal`. Owns the unified state→class visual vocabulary
of meal logging: `idle` (plain) · `editing` (bordeaux outline) · `confirmed`
(bordeaux fill) · `locked` (greyed), plus the **conflict** (eliminated-today) red
variants of each. See PRD [issue #242](https://github.com/jirigrill/eczema-helper/issues/242).
(The vocabulary was previously also reused by the now-retired `MealTypePills`.)

### FoodEditor

The inline `Množství` (`PortionKind`) + `Příprava` (`PreparationMethod`) editor that
unwraps beneath an `editing` food. One component mounted in two hosts: the drill-in
`FoodTile` and the grid working-list row. Renders `Chip`s; emits amount/preparation
changes. Carries no meal-level `Poznámka` (that lives on the grid only).

### MealTypePills *(retired)*

The in-`/meal` meal-type pill row that owned the empty/current/filled visual state and
the move / switch-away / load click logic. **Retired** when meal type became
[Fixed-at-Entry](#fixed-at-entry-meal-type): type is chosen on the day page (see
[Meal-Type FAB Submenu](#meal-type-fab-submenu--meal-launcher)) and no longer switches
inside `/meal`. The component, its tests, and the `discard-buffer.loadedFromType`
field were removed in issue #266. → See ADR-0018.

---

## Architecture Terms

### Ports & Adapters

The architectural pattern used for persistence. **Ports** are TypeScript interfaces in
`src/lib/domain/ports/` (e.g. `ScheduleRepository`, `QuestionnaireRepository`). **Adapters**
are concrete implementations in `src/lib/adapters/` (e.g. `DexieScheduleRepository`,
`DexieMealRepository`). Each port has a single `Dexie*` implementation; adapters are
tested against `fake-indexeddb`. Hand-written `InMemory*` fakes were removed per
the [decisions log](docs/decisions-log.md) (was ADR-0013). Domain logic depends only
on the port interfaces.

### ScheduleRepository / QuestionnaireRepository

Ports (interfaces) for persisting and loading the two core data objects. Single
implementation each: `Dexie*` (production), tested against `fake-indexeddb`
(see the [decisions log](docs/decisions-log.md), was ADR-0013). Both follow the
`Result<T, E>` return convention for `save` / `load` operations.

### Result\<T, E\>

Discriminated union for fallible operations: `{ ok: true; data: T } | { ok: false; error: string }`.
Used by all repository methods. Prevents silent swallowing of persistence errors.

### PhaseType

The stable string-literal type used to identify a protocol phase in domain records.
Values: `'reset' | 'elimination' | 'reintroduction' | 'rest' | 'tolerance-building'`.
Domain records carry `type: PhaseType`; Czech text is resolved from `$lib/strings/phases`
(`label`, `badgeLabel`, `description`); full display config including visual tokens from `$lib/config/phases`.
See ADR-0014.

### PortionKind

The stable string-literal type for a **meal-item portion size**.
Values: `'pinch' | 'teaspoon' | 'spoon' | 'portion' | 'package'`.
These are descriptive — what the mother actually logged eating on a `MealItem`.
Czech display labels live in `src/lib/strings/portions.ts`. See ADR-0014.

Not to be confused with a `LadderStep`, which is the prescriptive dosing
instruction the protocol recommends during reintroduction.

### Presentation String

A locale-bound display label resolved from a domain identifier at render time.
Presentation strings never live on domain records. Domain records carry the identifier;
`src/lib/strings/` (pure Czech text) and `src/lib/config/` (text + visual tokens)
map it to human-readable text and visual tokens.
See ADR-0014.

### Singleton ID

The constant string `'singleton'` used as the primary key for both `answers` and
`schedule` tables in Dexie. The app is single-user — exactly one row per table.
→ See ADR-0001.

### ISO Date

`YYYY-MM-DD` string. The standard date representation throughout the codebase.
Never use `Date` objects across module boundaries; convert at the edge.

---

## Cross-References

| For details on… | See… |
|-----------------|------|
| Deep domain invariants | `CONTEXT.md` |
| Architectural decisions | `docs/adr/` |
| Color tokens, typography, spacing | `DESIGN.md` |
| Project status + directory layout | `docs/README.md` |
| Component variants (visual) | `docs/design/components-showcase.html` |
| All screens (interactive prototype) | `docs/design/redesign-prototype.html` |
