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
and `isEvaluationDay` (true on the last day, triggers verdict UI). Carries **no Czech
strings** — the render site resolves the day's dosing instruction from
`getProtocolForAllergen(allergenId)?.days[dayInPhase - 1].instructionCs`.

### AllergenProtocol

The static dosing config for one allergen's reintroduction phase. Shape:
`{ days: ProtocolDay[] }`. Per [ADR-0017](docs/adr/0017-allergen-catalog-storage-and-harvest.md)
it lives as the **optional `protocol` field on the `CanonicalAllergen` record**
(in `src/lib/data/allergen-catalog/`), no longer in a standalone
`REINTRODUCTION_PROTOCOLS` map; only records that carry it are reintroducible.
Accessed via `getProtocolForAllergen(id): AllergenProtocol | undefined`. v1 ships
baseline clinical guidelines only; dynamic adjustment per baby profile is deferred.

### ProtocolDay

A single day's entry within an `AllergenProtocol`:
`{ day: number, instructionCs: string, isEvaluationDay: boolean }`.
`instructionCs` is Czech dosing text (e.g. "50 g červené čočky"). `isEvaluationDay`
drives whether the verdict UI appears — it is a domain flag, not display state.

---

## Allergens & Elimination

### Allergen / Allergen Slug
*Czech: Alergen*

A food trigger substance identified by a string slug (e.g. `'dairy'`, `'eggs'`,
`'wheat'`). Slugs are the stable IDs used in schedules, meals, and elimination windows.
The display name and icon are resolved from the slug at render time. The slug type is
`AllergenId`.

### AllergenId / ProtocolAllergenId / CustomAllergenId

The typed shape of an allergen slug. Per [ADR-0017](docs/adr/0017-allergen-catalog-storage-and-harvest.md)
these are **derived** from the data-first catalog rather than hand-written unions:

- `CatalogAllergenId = typeof ALLERGENS[number]['id']` — every canonical allergen slug
  in the bundled catalog (32 records as of ADR-0017 slice 6).
- `ProtocolAllergenId = Extract<typeof ALLERGENS[number], { protocol: object }>['id']`
  — the 13-record subset whose record carries a reintroduction `protocol`. Only
  allergens in this set can enter a reintroduction phase.
- `CustomAllergenId = \`other:${string}\`` — free-text allergen slugs the mother
  defines herself (e.g. `'other:Paprika'`). Participates in elimination logs, never
  enters a protocol phase. Unknown free-text input is also captured as a
  `HarvestCandidate` for eventual promotion into a `CanonicalAllergen`.
- `AllergenId = CatalogAllergenId | CustomAllergenId` — the union.

`AllergenId` is the unified type used at fields whose value can come from either
tier (`motherAllergies`, `babyConfirmedAllergies`,
`AllergenStatus.allergenId`).

Fields known by construction to be protocol-only are typed `ProtocolAllergenId`
directly (`SchedulePhase.allergenIds`, `testedAllergens`,
`ReintroductionDayInfo.allergenId`, `ToleranceBuildingReminder.allergenId`,
`DEFAULT_TESTED_ALLERGENS`). Lookups crossing the boundary go through
`getProtocolForAllergen(id: AllergenId): AllergenProtocol | undefined`. See ADR-0014
"Domain-key shapes" section.

### Family / Allergen / Food — three-level catalog
*Czech: Rodina / Alergen / Potravina. See
[ADR-0017](docs/adr/0017-allergen-catalog-storage-and-harvest.md)
and the CONTEXT.md "Family / Allergen / Food" entry for full definitions and
invariants.*

The catalog has three levels, each with a derived id:

- **Family** (`FamilyId`) — broad grid tile / log bucket (`Ovoce`, `Mléko`,
  `Vlastní`). Presentation only; no protocol, no clinical meaning.
- **Allergen** (`AllergenId`, with `ProtocolAllergenId` its protocol-bearing
  subset) — the reintroduction unit. Carries `protocol`; engine unchanged.
- **Food** (`FoodId`, with `CustomFoodId = other:${string}` its free-text tier) —
  first-class loggable entity carrying `familyId` (presentation) and
  `allergenIds` (its trigger set, many-to-many).

Two invariants (full text in CONTEXT.md): a food's **family is presentation, its
allergen is domain** (they may diverge — `sójové mléko` → family `Mléko`, allergen
`soy`); and the **questionnaire selects allergens, the meal log selects foods**.
Triggers are **resolved live** from the catalog, never snapshotted onto a
`MealItem`.

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
→ Defined in `CONTEXT.md`. The set of allergens the mother may not eat on a given date,
derived by `getEliminatedSlugsForDate(schedule, date)`.

### Conflict Detection

Identifying `MealItem`s in a logged meal that violate the current `EliminationWindow`.
Performed by `detectConflicts(meal, eliminatedSlugs)`. Surfaces a warning before the
user saves a meal.

### CanonicalAllergen / Canonical Catalog
→ Defined in `CONTEXT.md`. The curated, data-first catalog record for one
allergen (`id`, `icon`, `subitems`, `aliases`, optional `source`,
optional `protocol`). The `ALLERGEN_CATALOG` array of these records (in
`src/lib/data/allergen-catalog/`) is the source of truth from which `AllergenId`
/ `ProtocolAllergenId` are derived. Bundled, build-time, JSON-serializable, read
through `CanonicalCatalogPort`. See ADR-0017.

### HarvestCandidate
→ Defined in `CONTEXT.md`. A runtime Dexie record for an unknown food the
mother typed: `normalizedKey`, `rawForms` (deduped surface forms),
`count`/`firstSeen`/`lastSeen`, and `status` (`pending | ingested`). The harvest
feed and eventual sync payload; graduates into a `CanonicalAllergen` by
curation. See ADR-0017.

### CanonicalCatalogPort
The port (hexagonal seam) through which the domain reads the allergen catalog.
The only adapter today returns the bundled `ALLERGEN_CATALOG`; a remote, server-pushed
adapter is deferred behind it (ADR-0017). Keeps the catalog source swappable
without touching domain or UI.

### Normalized Key
The deterministic lowercase/trimmed/whitespace-collapsed form of a food name
used to dedupe `HarvestCandidate` rows and to match free-text input against a
`CanonicalAllergen`'s `aliases`. Precision-biased: diacritics are **kept** and
no stemming is applied on-device — authoritative clustering is a deferred
server job. See ADR-0017.

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

Persisted by `QuestionnaireRepository`. Source of truth for `generateSchedule()`.

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
The six-field payload carried by the `ready` arm of `ScheduleContext`: `schedule`,
`answers`, `allergenStatuses`, `eliminatedToday`, `reintroInfo`, `progress`. Produced
by `buildScheduleContext(raw, today)` in `src/lib/domain/schedule-queries.ts` — a pure
projection with no DB dependency. See [ADR-0015](docs/adr/0015-stores-as-imperative-shells.md).

### protocolSession

The unified module (`src/lib/stores/protocol-session.ts`) that owns **both** reads and
writes for the protocol seam. Exposes a `subscribe` function (delegating to
`scheduleContext`) plus four write operations: `startProtocol(answers)`,
`appendReTests(slugs, today)`, `removeReTest(allergenId, today)`, `reset()`. Routes that
mutate protocol state import `protocolSession` instead of instantiating adapters
directly. Routes that only read may still import `scheduleContext`.

### skinObservationSession

The store module (`src/lib/stores/skin-observation-session.ts`) that is the **sole seam**
for reading and writing today's `SkinObservation` records. Shaped like `mealSession`:
a `readable<SkinObservation[]>` backed by `liveQuery` over today's rows, plus a `save`
method delegating to `DexieSkinObservationRepository`. It is the only place that imports
`db` and constructs the adapter for skin observations. Routes subscribe to
`$skinObservationSession` for reactive reads and call `skinObservationSession.save()`
for writes; they do not instantiate adapters directly.

[Slice 4](docs/adr/0008-tracer-bullet-slices.md) converts this (and `mealSession` /
`skinPhotoSession`) into a **date factory** — `createSkinObservationSession(date)` returns
a `readable` scoped to that date — so the unified Day View can read any selected date while
`liveQuery` stays in the stores layer ([ADR-0009](docs/adr/0009-schedule-context-store.md)
boundary rule). A `todayIso()`-bound instance remains the default for today-only callers.

### skinPhotoSession

The store module (`src/lib/stores/skin-photo-session.ts`) that is the **sole seam** for
reading and writing today's `SkinPhoto` records. Shaped like `mealSession`: a
`readable<SkinPhoto[]>` backed by `liveQuery` over today's rows, plus a `save` method
delegating to `DexieSkinPhotoStore`. It is the only place that imports `db` and
constructs the adapter for skin photos. Routes subscribe to `$skinPhotoSession` for
reactive reads and call `skinPhotoSession.save()` for writes; they do not instantiate
adapters directly.

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

A record of the mother's food intake for one date+mealType slot. Fields: `id`
(`MealId`), `date`, `mealType`, `items` (list of `MealItem`), `actor` (always
`'mother'` in v1), optional `notes` (free-text observation), `createdAt` (ISO
datetime string — rendered as Czech `HH:MM` at display sites, never stored
formatted; see ADR-0014). Meals are day-granular — no user-facing time of day.
→ See ADR-0003.

### MealId
*Czech: —* (internal key, not user-visible)

Deterministic composite key for a `Meal`: `` `${date}:${mealType}` `` (e.g.
`"2026-05-27:lunch"`). Enforces the one-meal-per-slot invariant at both the
type level and the Dexie unique index (`&id`). Never a random UUID.

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

One of: `'boiled'` (Vařené) · `'steamed'` (Dušené) · `'baked'` (Pečené) ·
`'fried'` (Smažené). Optional observational field on `MealItem` — records how
the food was prepared. Has no impact on allergen conflict detection; stored
purely for the mother's reference.

### PortionKind
*Czech: Velikost porce*

One of: `'pinch'` (Špetka) · `'teaspoon'` (Lžička) · `'spoon'` (Lžíce) ·
`'portion'` (Porce) · `'package'` (Balení). The **meal-logging** portion size —
what the mother recorded eating on a `MealItem`. Distinct from `AllergenProtocol`
/ `ProtocolDay`, which are the protocol-prescribed dosing instructions during
reintroduction. See ADR-0014.

### Actor
→ Defined in `CONTEXT.md`. The person whose food intake a `Meal` describes. Always
`'mother'` in v1.

### Working Meal / Working List
*Czech: Rozdělané jídlo*

The in-memory meal being built on `/meal` before it is finalized — the list of
**confirmed** foods plus the current `MealType`. Not a persisted `Meal`: it exists
only in component/store state until "Hotovo" writes it to Dexie. See the
**commit-gate** and PRD [issue #242](https://github.com/jirigrill/eczema-helper/issues/242).

### Commit-Gate
The persistence rule for `/meal`: **nothing is written to Dexie until "Hotovo."**
Drill-in confirmations and family commits mutate only the working list; leaving
without finalizing discards it (guarded by **optimistic discard + undo**).
→ See ADR-0018.

### Active Edit Slot
The invariant that **at most one food is in the `editing` state per screen.**
Entering editing locks (greys, disables) every other food tile and the family
grid; confirming or discarding releases the slot. Drives the save button's label
(editing → "Uložit {Food}"; idle → "Uložit {Family}" or "Hotovo — {Meal}").

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
**Move** / **Switch-Away** pill actions, recorded in the superseded ADR-0019.)

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
`discardBuffer`, and navigates to `returnTo`; the layout's existing **discard toast**
offers `Zpět` (undo). Undo rehydrates the working list from the snapshot — re-tapping
**Hotovo** then re-persists a fresh copy. Hidden while composing a brand-new meal
(nothing to delete). → See ADR-0018, issue #268.

### Empty-Hotovo Guard
Finalizing a zero-food working list is a **no-op** by construction. While composing a
new meal, the disabled CTA carries the message implicitly. While editing an existing
meal whose foods have been ✕'d to zero, an inline hint near the CTA tells the user to
use **Smazat jídlo** instead — closing the loophole where "empty then save" could
have been a hidden delete path. → See issue #268.

---

## Assessment & Observation

### SkinObservation
→ Defined in `CONTEXT.md`. The parent's observation of the baby's skin on a calendar
day: `id`, `date`, `createdAt`, `AssessmentStatus`, optional notes. Multiple
`SkinObservation` records may exist for the same day. No FK to `SkinPhoto`.

### SkinPhoto
→ Defined in `CONTEXT.md`. A photo of the baby's skin captured on a calendar day:
`id`, `date`, `capturedAt`, `blob` (Blob stored in IndexedDB). Independent of
`SkinObservation` — a photo does not require an accompanying observation and vice
versa. Multiple `SkinPhoto` records may exist for the same day.

### AssessmentStatus
*Czech: Stav kůže*

One of: `'improved'` (Zlepšení) · `'unchanged'` (Beze změny) · `'worsened'`
(Zhoršení) · `'new-lesions'` (Nová ložiska). Selected by the parent daily.

### ReintroductionEvaluation
→ Defined in `CONTEXT.md`. The allergen-attributed verdict at the end of a
reintroduction phase. The only place causation is explicitly recorded.

### AllergenOutcome

The four possible verdicts in a `ReintroductionEvaluation`:
`'tolerated'` (Toleruje) · `'mild-reaction'` (Mírná reakce) ·
`'clear-reaction'` (Jasná reakce) · `'severe-reaction'` (Silná reakce).

### Insight
→ Defined in `CONTEXT.md`. A derived pattern card computed over `(Meal, SkinObservation)`
pairs. Not user input. Deferred to v1.1.

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
| `/settings` | Nastavení | App configuration (v1.1) |

### Onboarding
*Czech: Průvodce*

The 6-step questionnaire that collects `QuestionnaireAnswers` and generates the initial
`GeneratedSchedule`. Steps: baby birth date → eczema severity → mother allergies →
baby confirmed allergies → program start date → summary.

### Day View (Den / Dnes)

The single day layout, rendered for any date by `/day/[date]`. **Today** is just the
instance where the selected date equals `todayIso()`; there is no separate past-day
design. Contains: `WeekStrip`, phase hero, the allowed/avoid reference, the three record
cards (skin status, photos, meals), and an add affordance (the FAB). The mother reaches
past days by paging the `WeekStrip` back; she can backfill or edit those days to the same
parity as today (meals overwrite per slot; skin observations and photos add-only — no
delete yet). **Action-prompt chrome** — tolerance-building reminders and the task counter
— renders only when the selected date is today; past days show historical facts only.
The data path is reactive per selected date (`buildScheduleContext(raw, selectedDate)` +
date-scoped session-store factories), see [ADR-0009](docs/adr/0009-schedule-context-store.md)'s
Slice-4 amendment. The main screen a user opens each day.

### Program Screen (Postup)

Read-only timeline of all protocol phases. Shows phase dates, current position,
`PermanentEliminations`, reintroduction instructions, and re-test options.

---

## UI Patterns & Components

### Snippet

A Svelte 5 `{#snippet}` block — a named, reusable chunk of template markup scoped to a single file. Distinct from a *component* (its own `.svelte` file, importable, independently testable). Snippet props (`children`, `right`, `action`) are the mechanism for injecting varying markup into a component shell from the outside.

### WeekStrip
*Czech: 7-denní páska*

A 7-column **sliding-window** strip: the selected day sits at the right edge with the six
prior days to its left; tapping the left-most cell pages the window further back. Clamped
to **[protocol start, today]** — no future days, nothing before the contextless pre-start
range. A "Dnes" pill returns to today when the selected day is not today. Each cell shows:
uppercase 2-char day abbreviation (`Po`, `Út` …), day number, and a `SeverityDot`. The
selected cell is
highlighted in the primary color.

### SeverityDot
*Czech: Puntík závažnosti*

A 6×6 px color-coded circle on a `WeekStrip` cell indicating the baby's recorded skin
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

### EczemaCheck

The daily skin assessment form component. Props: `date`, `assessment` (existing or
null), `reintroductionAllergenId` (non-null during a reintro phase, triggers contextual
pill), `onSave`. Renders the 4-button `AssessmentStatus` picker, notes textarea, and
photo toggle.

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

### FoodToken

The selectable food tile on `/meal`. Owns the unified state→class visual vocabulary
of meal logging: `idle` (plain) · `editing` (bordeaux outline) · `confirmed`
(bordeaux fill) · `locked` (greyed), plus the **conflict** (eliminated-today) red
variants of each. See PRD [issue #242](https://github.com/jirigrill/eczema-helper/issues/242).
(The vocabulary was previously also reused by the now-retired `MealTypePills`.)

### FoodEditor

The inline `Množství` (`PortionKind`) + `Příprava` (`PreparationMethod`) editor that
unwraps beneath an `editing` food. One component mounted in two hosts: the drill-in
`FoodToken` and the grid working-list row. Renders `Chip`s; emits amount/preparation
changes. Carries no meal-level `Poznámka` (that lives on the grid only).

### MealTypePills *(retired)*

The in-`/meal` meal-type pill row that owned the empty/current/filled visual state and
the move / switch-away / load click logic. **Retired** when meal type became
[Fixed-at-Entry](#fixed-at-entry-meal-type): type is chosen on the day page (see
[Meal-Type FAB Submenu](#meal-type-fab-submenu--meal-launcher)) and no longer switches
inside `/meal`. The component, its tests, and the `discard-buffer.loadedFromType`
field were removed in issue #266. → See ADR-0018 (supersedes ADR-0019).

---

## Architecture Terms

### Ports & Adapters

The architectural pattern used for persistence. **Ports** are TypeScript interfaces in
`src/lib/domain/ports/` (e.g. `ScheduleRepository`, `QuestionnaireRepository`). **Adapters**
are concrete implementations in `src/lib/adapters/` (e.g. `DexieScheduleRepository`,
`DexieMealRepository`). Each port has a single `Dexie*` implementation; adapters are
tested against `fake-indexeddb`. Hand-written `InMemory*` fakes were removed per
[ADR-0013](docs/adr/0013-drop-unused-in-memory-adapters.md). Domain logic depends only
on the port interfaces.

### ScheduleRepository / QuestionnaireRepository

Ports (interfaces) for persisting and loading the two core data objects. Single
implementation each: `Dexie*` (production), tested against `fake-indexeddb`
([ADR-0013](docs/adr/0013-drop-unused-in-memory-adapters.md)). Both follow the
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

Not to be confused with `AllergenProtocol` / `ProtocolDay`, which are the
prescriptive dosing instructions the protocol recommends during reintroduction.

### Presentation String

A locale-bound display label resolved from a domain identifier at render time.
Presentation strings never live on domain records. Domain records carry the identifier;
`src/lib/strings/` (pure Czech text) and `src/lib/config/` (text + visual tokens)
map it to human-readable text and visual tokens.
See ADR-0014.

### Singleton ID

The constant string `'singleton'` used as the primary key for both `answers` and
`schedule` tables in Dexie. v1 is single-user — exactly one row per table.
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
