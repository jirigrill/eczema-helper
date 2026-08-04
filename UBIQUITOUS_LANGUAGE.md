# Ubiquitous Language — Atopic Helper

Shared vocabulary for conversations between developer and AI about this codebase.
When either party uses a term listed here, it carries exactly this meaning.

**Maintenance rule:** when a term's meaning changes in code, update this file in the same PR.
Terms already defined in depth elsewhere are referenced, not duplicated.

---

## Feeding Stage

### FeedingStage

`'breastfed' | 'mixed' | 'solids'` in `models.ts`, stored on
`SettingsData.feedingStage`. The live master switch for who may be logged:
`getEligibleActors(stage)` returns `breastfed → [mother]`, `mixed → [mother,
baby]`, `solids → [baby]`. Seeded at first run, editable in `/settings`, owned by
`stores/settings.svelte.ts`.

## Food Catalog

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

---

## Application State

### SettingsData / settingsContext

The user-controlled **live master switch(es)**, held in a dedicated `settings` Dexie
singleton row (keyed by `SINGLETON_ID`, mirroring `answers`/`schedule`). Today it holds
`feedingStage: FeedingStage`, with room for future settings. Deliberately **off**
`GeneratedSchedule` so retest/verdict rebuilds cannot overwrite it. Persisted by
`SettingsRepository` (port + `DexieSettingsRepository`); seeded from
`answers.feedingStage` inside the same onboarding-completion transaction as the schedule.
`settingsContext` (`src/lib/stores/settings-context.ts`) is the `liveQuery`-backed
reactive store consumers read for the live value; changed live from the Settings screen
via `settingsStore.setFeedingStage()`.

### SettingsRepository

The port (`src/lib/domain/ports/settings-repository.ts`) for persisting and loading
the `SettingsData` singleton — `save(settings)` / `load()`, both returning
`Result<…, string>`. Single implementation `DexieSettingsRepository`
(`src/lib/adapters/dexie-settings-repository.ts`), tested against `fake-indexeddb`.
Reached through `settingsStore` for the feeding-stage write and `settingsContext` for
reactive reads; routes never construct the adapter directly. Mirrors the `ScheduleRepository` /
`QuestionnaireRepository` shape.

### settingsStore / seededStatus

The live settings store (`src/lib/stores/settings.svelte.ts`) — the write seam and
seeded-signal source for `SettingsData`. `settingsStore.setFeedingStage(stage)` persists
the feeding stage through `DexieSettingsRepository`; `seededStatus` is the tri-state
(`'loading' | 'unset' | 'seeded'`) the layout reads to decide first-run routing — it
*holds at `loading`* until the settings `liveQuery` first emits, so a seeded mother is
never bounced from `/day/<today>` to `/`. Distinct from `settingsContext`, the reactive
read store for the live value. Routes reach the store; they never construct the adapter.

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

### MealSlot
*Czech: —* (internal address, not user-visible)

The addressable `(date, mealType, actor)` triple a `MealId` encodes — the
identity of a meal's slot without its contents. Named type in `models.ts`;
`parseMealId` returns it, and copy-meal / discard-buffer code pass it around
(e.g. `copyMealInto(..., targetSlot: MealSlot)`, `DiscardedMealCopy.destinationSlot`)
rather than re-inlining the three fields.

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
[FeedingStage](#feedingstage): `breastfed → [mother]`,
`mixed → [mother, baby]`, `solids → [baby]`. Every `Meal` carries its `actor`
in the composite `MealId` (`date:mealType:actor`).

### getEligibleActors
`getEligibleActors(stage: FeedingStage): Actor[]` in `models.ts` — the single
source for "who may log at this feeding stage". Returns `breastfed → [mother]`,
`mixed → [mother, baby]`, `solids → [baby]`. Read by the `/meal` route (drives
the [Actor Picker](#actor-picker) visibility and the implicit-actor snap) and
mirrored in prose by the [Actor](#actor) invariant. The mirrored-schedule
rationale (one protocol, two permanent-elimination sets) is parked with the
protocol engine (ADR-0027) — see the [revival catalog](#revival-catalog).

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
while composing a brand-new meal (nothing to delete). Removing every food and then
saving or backing out is an **equivalent delete path** (issue #588): it removes the
row and shows the same `Jídlo smazáno` toast + undo. → See ADR-0018, issues #268, #588.

### Discard Toast
The layout-level `Toast` (with `Zpět` undo) shown after the working meal is buffered to
`discardBuffer`. Its wording is keyed by the buffer's `kind` so it stays accurate to what
was actually lost: **`Jídlo neuloženo`** (compose-new draft), **`Změny neuloženy`** (dirty
edit — the saved meal stays, only the edits drop), **`Jídlo smazáno`** (delete). A *clean*
edit-back shows no toast. → See ADR-0018 "Discard guard".

### Empty-meal delete (issue #588)
Emptying an existing meal deletes it. While editing a saved meal whose foods have been
✕'d to zero, the finalize CTA stays enabled and an inline hint near it warns that
saving will delete the meal (`Jídlo je prázdné — uložením ho smažeš.`); saving or
backing out removes the row and shows the `Jídlo smazáno` toast + undo, exactly like
the explicit **Smazat jídlo**. Composing a brand-new meal with zero foods is still a
**no-op** — the disabled CTA carries "nothing to save" implicitly (nothing was ever
persisted, so there is nothing to delete). (Reverses the earlier #586 "Empty-meal
Guard", which made empty-save a no-op and routed the user to Smazat instead; formerly
"Empty-Hotovo Guard".) → See issues #268, #586, #588.

### Copy a meal / Merge (copy)
*Czech: Kopírovat jídlo* (overflow action) / *Kam zkopírovat?* (picker heading) / *Kopírovat sem* (per-slot target)

Copying a saved `Meal` into another slot (another day or meal type — the actor
is always the source's; a copy is **same-actor**).
The pure assembler `copyMealInto` (`src/lib/domain/working-meal.ts`) produces
the destination `Meal` plus the items the copy added. Into an **empty** slot it
composes a new meal (fresh `MealId` + `createdAt`, no note, no `updatedAt`).
Into an **occupied** slot it performs an **additive merge** keyed by `foodId`:
only foods the destination lacks are added, the **destination always wins** on
collision (differing portion/prep does not override), and the destination's
`createdAt` + note are preserved while `updatedAt` is stamped. A copy that would
add nothing — the destination already holds every source `foodId`, including
copying a meal onto its own slot — is a **no-op** (`meal: null`, `added: []`).
**A copy never carries the source note.** → See CONTEXT.md "Copy Meal".

The flow (spec #599, issue #606): the `⋯` overflow on the meal editor exposes
**Kopírovat jídlo** (only when the source meal has ≥1 food) → a **destination
picker** (reused `DayStrip` + `FabActionSheet` slot sheet, actor fixed to the
source; out-of-window destination *dates* are pre-disabled). Confirm resolves the
merge target actor-scoped via `loadBySlot(destDate, destSlot, source.actor)` —
**actor-scoped occupancy**, so the other actor's meal in the same visual cell is
untouched — calls `copyMealInto`, and on a
successful `save()` writes a **`meal-copy` discard descriptor** (undo reverses
the write: delete the created meal, or drop just the added items and restore the
prior `updatedAt`). Any manual edit/delete/further copy of the destination slot
invalidates that descriptor (US-17), so undo can never trim hand-added food.
Actor **eligibility is not re-checked** on the destination date (the actor is
never chosen). → See CONTEXT.md "Copy Meal" for both flow-level invariants.

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

### Insight
→ Defined in `CONTEXT.md`. A derived pattern card computed over `(Meal, SkinObservation)`
pairs. Not user input. Not built (tracked in [#468](https://github.com/jirigrill/eczema-helper/issues/468)).

---

## UI Screens

Route names and their Czech display labels:

| Route | Czech label | Purpose |
|-------|-------------|---------|
| `/` | Vítejte | First-run screen: welcome + feeding-stage picker |
| `/day/[date]` | Den / Dnes | Day View: the one day layout for any date (see below). Replaces the former `/today` route |
| `/meal` | Přidat jídlo | Meal logging form |
| `/settings` | Nastavení | App configuration |

### Onboarding
*Czech: Průvodce*

The single first-run screen: short welcome copy plus the feeding-stage picker, which
writes `SettingsData.feedingStage` and lands on `/day/<today>`. `settings.feedingStage
!= null` is the app's *seeded* signal — unset routes to `/`, set routes to the day view.
The stage stays editable in `/settings`.

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

A horizontally scrollable, **continuous** strip of day cells spanning the mother's
history rather than a plan: from her **earliest logged day** (the earlier of the first
meal and the first skin observation, live-subscribed) through **today**, with no future
cells. Its input is `{ selectedDate, earliestLogged, today }` and the range is
`min(earliestLogged ?? today, selectedDate) … today`; clamping the start to `selectedDate`
keeps a directly-navigated earlier day rendering its own cell. With nothing logged the
strip is the single cell **today**, and it grows the instant an earlier day is logged.
Selecting a day flags it **in place** — the strip does not reshuffle around the selection.
**Today** carries a permanent ring marker in its own slot, with a hollow centre dot when
today is not yet recorded and a filled dot once it is. There is no "Dnes" pill and no
in-strip return-to-today control — return-to-today is the bottom-nav `Dnes` tab. Each
cell shows: uppercase 2-char day abbreviation (`Po`, `Út` …), day number, and a
`SeverityDot`. The selected cell is highlighted in the primary color.

### SeverityDot
*Czech: Puntík závažnosti*

A 6×6 px color-coded circle on a `DayStrip` cell indicating the baby's recorded skin
state for that day. Color maps to the 5-point severity scale (`sev-1` green → `sev-5`
red). Empty if no assessment recorded.

### ↩ Dnes chip
*Czech: ↩ Dnes*

The return-to-today control in the `/day/[date]` header, shown **only off today**
(`!isToday`), rendered from `commonStrings.nav.backToToday`. Tapping it navigates to
`/day/<today>` and pulses the recentre signal (`stores/day-strip-recentre.ts`) so the
`DayStrip` re-centres on today even when it was scrolled away. Introduced by the
descaling (PRD #623, §3) as the day view's own return-to-today affordance, replacing the
removed bottom-nav `Dnes` tab.

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

### Parked snapshot

The annotated git tag `parked/protocol-engine`, freezing `main` at the moment before the
elimination-protocol engine was stripped out (descaling to logging-only, PRD #623). It is
the lossless archive of every parked file, symbol and doc — the elimination schedule,
allergen matching, the reintroduction ladder and its decision engine, the onboarding
questionnaire, and the protocol ADRs. Referenced across `CONTEXT.md`, `CLAUDE.md` and the
[revival catalog](#revival-catalog). Read `git show parked/protocol-engine` to inspect it.

### Revival catalog

`docs/parked-features.md` — the frozen slicing index over the [parked
snapshot](#parked-snapshot): which parked path, symbol and doc belongs to which parked
feature, plus the mechanical revival procedure. Written once at strip time and **not
maintained** (verify against current `main` before reviving). The durable record of what
descaling parked.

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
