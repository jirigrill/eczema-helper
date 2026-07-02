# Context — Atopic Helper

Domain vocabulary and invariants for the Atopic Helper app. Read before
extending the domain or naming new concepts. Update inline as decisions
crystallise; do not let it drift from the code.

## Glossary

### ScheduleContext
Today's protocol state as the UI sees it — a reactive bundle of
`GeneratedSchedule`, `QuestionnaireAnswers`, and derived protocol values
(`eliminatedToday`, `reintroInfo`, `progress`) computed for the current
date. Exposed as a discriminated union: `loading | empty | ready | error`.
Derived fields only exist on `ready`. The `error` variant carries a string
message from a failed repository load. This is an application-layer concept,
not a domain concept — it is the authoritative name for what routes consume,
as distinct from the raw `GeneratedSchedule` stored in the database.

### MealEditor
The meal editing lifecycle as one home — a runes module
(`src/lib/stores/meal-editor.svelte.ts`, factory `createMealEditor()`)
that owns a meal "from open to save/discard". The `/meal` route delegates
load/save/dirtiness/conflicts here and keeps only view/navigation state
(`drilledFamily`, `gridEditingFoodId`, popstate/shallow routing, `goto`).
An application-layer concept, like `ScheduleContext`; distinct from
`meal-session` (the Dexie/`liveQuery` persistence store it reaches through)
and `working-meal` (the pure in-memory value it edits via a single
`update(fn)` chokepoint). Mirrors `day-view.svelte.ts`, extended from
read-only projection to read-write editing.

Three invariants live here (the home ADR-0018 lacked):

- `createdAt` survives an edit; `updatedAt` is stamped only on edit;
  compose-new mints a fresh `createdAt` and writes no `updatedAt`.
- An empty meal never persists — `finalize()` with zero confirmed foods is
  a no-op; emptying a meal is done via an explicit delete, not by saving
  empty.
- Dirtiness is snapshot-relative — compose-new is dirty iff any food is
  confirmed/editing; an edit is dirty iff live foods or trimmed notes
  differ from the load snapshot (order-independent food comparison).
  The comparison itself (`snapshotOf` / `snapshotsEqual`) lives in the
  pure domain module `src/lib/domain/meal-dirtiness.ts`; `MealEditor`
  owns *when* dirtiness is computed and reaches into the module for *how*.

**Conflict responsibility:** `MealEditor` exposes which of its foods touch
today's elimination window (`eliminatedFoodIds`, `hasConflicts`) by calling
the *shared* domain `detectConflicts` over its own foods — so the meal
screen, `MealCard`, and day view stay consistent and the implementation can
be swapped behind one call site. It takes `eliminatedToday` (an
`AllergenId[]`) injected by the route; it never reads `scheduleRaw` or calls
`buildScheduleContext`. The view-specific danger flags (per-row styling, the
warning banner, the red CTA, reintro dosing) stay in the route, built on top
of `eliminatedFoodIds`. See ADR-0018 and PRD issue #284.

### SkinObservation
A timestamped record of what the parent observed about the baby's skin
at a point in time: a set of per-region severities (`regions`) on a
four-step absolute scale (`RegionLevel` 0/1/2/3 — klidné / mírné /
střední / silné), plus optional free-text `notes`. **Every saved
observation witnesses all nine regions** — regions the parent did not
explicitly bump persist at level 0 (klidné), not as absent rows. This
makes "checked, looked clear" distinguishable from "didn't check"
(absent observation for the day). Captured atomically with any photos
taken in the same session via
`SkinObservationRepository.save(observation, photos)`. Multiple
`SkinObservation` records may exist for the same calendar day (e.g. a
routine morning check and a later reaction log). The form shape is
identical on ordinary days and reintro-test days. There is no
`suspectedCause` field; attribution is not recorded here. Day-overall
severity is derived as `max(regions)` via `overallSeverity()` and never
persisted.

**Identity and mutability.** `id` and `createdAt` are immutable across
edit, delete, and undo-after-delete — `createdAt` represents the
witnessing moment, not the row's last-write timestamp. Edits overwrite
`regions`, `notes`, and the photo set atomically; delete is a hard
delete cascading to all `SkinPhoto` rows for that observation. The
`/skin` route handles compose and edit in the same file, discriminated
by the presence of `?id=` in the URL. The
`SkinObservationRepository` port exposes four verbs: `save` (compose),
`update(obs, { addPhotos, removePhotoIds })` (edit), `remove(id)`
(delete, cascades to photos), and `listByDate(date)` (read).

See ADR-0004 (causation derived), ADR-0021 (regional
severity shape), ADR-0021 (klidné as positive evidence — formerly
ADR-0022, merged in 2026-06-30), and ADR-0021 (edit and delete
preserve identity, 2026-06-30).

### Region
One of nine canonical body areas the parent can log on `/skin`: face,
scalp, neck, belly, back, arms, elbow-folds, knee-folds, legs. The
union is frozen for v1; new regions require an ADR. Identified by
`RegionId` — a kebab-case English-rooted slug. Czech display labels
live in `src/lib/strings/skin-regions.ts` keyed by `RegionId` (per
ADR-0014).

### RegionLevel
The absolute severity of a single region, on a four-step scale: `0`
klidné, `1` mírné, `2` střední, `3` silné. Klidné is the explicit
default — a region the parent never touched is calm, not unknown.
Czech labels and severity hex tokens live in the strings + config split
under `src/lib/strings/skin-regions.ts` and
`src/lib/config/skin-regions.ts`.

### Active region
On `/skin`, the region currently selected for tap-to-cycle. Tapping
an inactive region only activates it; tapping the active region cycles
its severity 0 → 1 → 2 → 3 → 0. Active is a UI-only concept — never
persisted.

### Logged region
Historical term, retired by ADR-0021 (klidné-as-positive-evidence
amendment, originally filed as ADR-0022). The Uložit gate on `/skin` no
longer requires "at least one region with `level > 0`" — every page
visit can save, and every save witnesses all nine regions. A region
with `level > 0` is now simply called a *bumped region*; the term
"logged" is no longer used in code or copy.

### SkinPhoto
A timestamped photo of the baby's skin, stored as a `Blob` in the
`photos` table (plaintext per ADR-0005). Every photo belongs to one
`SkinObservation` via a required `observationId` FK and carries the
`region: RegionId` it documents. Photos have no `date` field of their
own — the day they were captured is the date of the parent observation.
Writes go through `SkinObservationRepository.save(observation, photos)`,
which inserts observation + photos atomically; there is no standalone
photo write path. Day-scoped reads join `skin_observations` (by date)
with `photos` (by `observationId`). Multiple `SkinPhoto` records may
exist for the same observation (one per captured frame) and for the
same calendar day (across multiple observations).

### ReintroductionEvaluation
The verdict recorded at the end of a phase, keyed by `phaseId` (one
immutable row per phase / reintroduction attempt). Two kinds, by
`phaseType`:

- `allergen-test` — at the end of a `reintroduction` phase, picked from
  four outcomes (`tolerated` / `mild-reaction` / `clear-reaction` /
  `severe-reaction`). This is the *only* place where the user explicitly
  attributes a reaction to an allergen.
- `skin-status` — at the end of a `reset` or `elimination` phase, a
  reflective record of how the skin fared (`improved` / `unchanged` /
  `worsened` / `new-lesions`). A pure record; it changes no schedule and
  no status.

The verdict is an **audit fact**, not the source of truth for status.
Recording an `allergen-test` *reaction* drives a schedule mutation (a
`rest` phase is inserted; its length is severity-keyed), and
`AllergenStatus` is then derived from the resulting topology — the
evaluations table is never read by `getAllergenStatuses`. A reaction is
**never permanent** for a protocol allergen: a reacted allergen is
eligible for a later manual retest. The app may later suggest a
recommended outcome from the phase's daily observations (deferred to
v1.1); the user always confirms. See
[ADR-0016](docs/adr/0016-verdict-drives-schedule-not-status.md).

### Insight
A *derived* pattern card computed over `(Meal, SkinObservation)` pairs
(and the schedule). Not a stored user input. The pattern detector is a
pure function: `insights(meals, skinObservations, schedule) → Insight[]`.
Examples: "after dairy days, skin worsened in 3 of 4 cases — reaction
within 24h." Insights surface counter-examples too. Dismissals/pins are
UI state, not domain state.

### EliminationWindow
What the mother is forbidden to eat on a given day, derived by
`getEliminatedSlugsForDate(schedule, date)`. The result depends on the
current phase type:

| Phase | Eliminated |
|---|---|
| `reset` | Permanent eliminations only — mother eats normally otherwise |
| `elimination` | Permanent eliminations + all protocol allergens |
| `reintroduction` of X | Permanent + protocol minus X (current) minus already-passed allergens |
| `rest` | Permanent + protocol minus already-passed allergens (no current exception) |
| `tolerance-building` of X | X is allowed in small doses (status `tolerance-building` → not forbidden); every other allergen follows its own current `AllergenStatus` |
| After all phases | Permanent eliminations only |

`EliminationWindow` is now *derived from* `AllergenStatus` — the per-phase
table above is the projection rule, but the source of truth is the status
query. `getEliminatedSlugsForDate` works in two steps:

1. **Reset guard.** If the active phase is `reset` (or no phase is active),
   return only `permanentEliminations`. Protocol allergens carry status
   `eliminated` during reset (they are inside the early-phase window), but
   the mother eats them normally during reset to establish a baseline —
   forbidding them here would defeat that purpose.
2. **Status filter.** For all other phases, return ids of allergens whose
   status is in `{ permanent-mother, permanent-baby, eliminated, reacted,
   not-yet-tested }`. Statuses `{ testing, passed, tolerance-building }` are
   not forbidden.

`permanentEliminations` (the aggregate of `motherAllergies` +
`babyConfirmedAllergies`) always applies regardless of phase type. The
schedule stores `permanentMother` and `permanentBaby` as separate
fields; `permanentEliminations` is the derived concatenation for the
day-view filter.

### AllergenStatus
The per-allergen lifecycle state on a given calendar date, derived by
`getAllergenStatuses(schedule, date)`. One entry per allergen in the
*closed universe* `permanentMother ∪ permanentBaby ∪ protocolMembers`
— allergens outside that universe have no status (they are ordinary
foods, not allergens-of-interest).

Status is a discriminated string union:

| Status | Meaning |
|---|---|
| `permanent-mother` | Mother's own allergy. Lifelong. Never enters a reintroduction. Terminal. |
| `permanent-baby` | Baby's confirmed allergy. Eliminated by default; eligible for end-of-program retest via `appendReTestPhases`. |
| `not-yet-tested` | Protocol allergen with a reintroduction phase still in the future, or never scheduled. |
| `eliminated` | Currently inside the active `elimination` (or `reset`) phase. |
| `testing` | Currently inside a `reintroduction` phase. |
| `passed` | Latest reintroduction completed cleanly (no rest follow-up). |
| `reacted` | Latest reintroduction was followed by a rest phase (reaction signal). |
| `tolerance-building` | Open-ended `tolerance-building` phase active for this allergen. |

**Invariants:**

- *Latest-reintroduction wins.* An allergen may appear in multiple
  reintroduction phases (initial protocol + retest phases appended via
  `appendReTestPhases`). Status is determined by the most recent
  reintroduction phase that has started on or before `date`.
- *Reintroduction supersedes earlier `tolerance-building`.* If both a
  `tolerance-building` phase and a later `reintroduction` phase for the
  same allergen have started, the reintroduction phase drives the
  status.
- *Origin survives clearance.* A `permanent-mother` allergen never
  becomes `testing` — no domain operation creates a reintroduction
  phase for one. A `permanent-baby` allergen with a future retest phase
  remains `permanent-baby` until that phase activates; on activation it
  becomes `testing`, then either `passed` (clean retest) or reverts to
  `permanent-baby` (reacted retest).
- *Closed universe.* `getAllergenStatuses(schedule, date)` returns
  exactly `|permanentMother ∪ permanentBaby ∪ protocolMembers|` entries.
  No more, no fewer. The three sets are disjoint by construction
  (the protocol generator excludes permanents from `protocolMembers`).
- *Verdict resolves the morning after.* A reintroduction phase's `endDate`
  is its last dosing/observation day, so on `endDate` the allergen still
  reads `testing`. The verdict (`passed` / `reacted`) is therefore read at
  `endDate + 1` — "egg's result is known the next morning, not on the last
  dose day." Any consumer that wants a phase's final verdict must query
  `getAllergenStatuses(schedule, endDate + 1)`, never `endDate`.

See [ADR-0012](docs/adr/0012-allergen-status-lifecycle.md).

### CanonicalAllergen
A curated catalog record describing one allergen — its stable `id`, `icon`,
`subitems`, `aliases` (normalized surface forms), optional `source` provenance,
and an **optional** reintroduction
`protocol`. The records are the data-first source of truth: `AllergenId` is
derived as `typeof ALLERGEN_CATALOG[number]['id']`, and `ProtocolAllergenId` as
the subset of records that carry a `protocol`. A record without a protocol is
canonical and loggable but **not reintroducible** — the honest state of most
long-tail foods. Czech display `name` is not on the record; it lives in
`strings/` (ADR-0014). Records are bundled, build-time, and JSON-serializable,
read through `CanonicalCatalogPort`. See
[ADR-0017](docs/adr/0017-allergen-catalog-storage-and-harvest.md).

### Family / Allergen / Food — the three-level catalog

The catalog is three levels, each a distinct concept that earlier shared the
word "allergen":

- **Family** — the broad grid bucket / log tile (`Ovoce`, `Obiloviny`,
  `Mléko`, `Nuts-seeds`). One non-overlapping tile per food family. Pure
  organisation; carries no protocol and no clinical meaning.
- **Allergen** — the reintroduction unit. Carries the optional `protocol`,
  owns `AllergenStatus`, is what `ProtocolAllergenId` and
  `SchedulePhase.allergenIds` refer to. This is today's `CanonicalAllergen`
  record, unchanged — the refactor does **not** push `protocol` down to the
  food. An allergen belongs to exactly **one** family (its clinical home).
- **Food / item** — the concrete loggable thing (`sójové mléko`, `pomeranč`,
  `jogurt`, `hummus`). A **first-class catalog entity**, not a bare string
  parented to one allergen. Each food carries its own `familyId` (presentation)
  and a set `allergenIds: AllergenId[]` (its triggers): zero for a neutral food
  (`rýže`, `jablko`), one for the common case (`pomeranč` → `[citrus]`),
  **several** for a composite (`hummus` → `[chickpea, sesame]`). This is what
  the meal log records.

**Principle — a food's family is presentation; its allergen is domain.** The
`family` decides where a food appears in the grid; the `allergen` decides what
it conflicts with. They are assigned independently and may **diverge**: `sójové
mléko` has family `Mléko` (where a parent looks for a milk substitute) but
allergen `soy` (its trigger, whose own family is `Luštěniny`). A food's
`familyId` is assigned per food and may differ from any of its allergens'
families; the override exists only on foods, never on allergens. **Conflict
detection resolves only through a food's `allergenIds`, never its family** — a
food conflicts if **any** of its allergens is eliminated. The family is absent
from the trigger path. A food shown under `Mléko` is therefore never treated as
a dairy allergen; `sójové mléko` conflicts during a `soy` elimination and is
allowed during a `dairy` one. The food↔allergen relation is **many-to-many**:
one allergen is expressed by many foods, one food may trigger several allergens.

**Principle — food-source subgroup is a second presentation axis, family-scoped
and decoupled from allergen.** Inside a family drill-in, foods cluster by an
optional **source subgroup** (`Mléko` → *Kravské · Ovčí · Kozí · Rostlinné*;
`Obiloviny` → *S lepkem · Bez lepku*) — the axis the mother actually thinks in,
not the allergen-trigger axis. Source is its own field on a food (`sourceGroup`,
a key like `cow` / `gluten`), independent of both `familyId` and `allergenIds`:
`mandlové mléko` sits under source `Rostlinné` while its allergen is `nuts`, and
`sójové mléko` under `Rostlinné` while its allergen is `soy`. Grouping by allergen
would scatter these away from where they are looked for; source-grouping keeps
them together. The subgroup vocabulary is **per-family** — `cow` means nothing
outside `Mléko` — and lives, ordered, in the strings layer (`familySources`,
[ADR-0014](docs/adr/0014-presentation-strings-and-domain-keys.md)); the array
order is the render order. Grouping is a **progressive enhancement**: a family
renders grouped only when it has **≥ 5 foods _and_ an authored source structure**,
otherwise flat. Foods with no `sourceGroup` fall into a trailing **`Ostatní`**
bucket — a presentation catch-all carrying *no* safety claim (danger stays
per-food). Source never enters the trigger path; like `familyId` it is presentation
only — see [ADR-0019](docs/adr/0019-food-source-subgroup.md).

**Principle — what qualifies as a Food: atomic consumption *and* fixed
composition.** A catalog Food is a thing **acquired and eaten as one indivisible
unit whose allergen set is invariant across instances** — `jogurt`, `ovesné
mléko`, `mléčná čokoláda`, `nealkoholické pivo`, `hummus`, `tofu`. Two
independent tests both must hold: *atomic consumption* (eaten as one unit, the
eater cannot separate the parts — milk chocolate is one bar, you cannot eat the
cacao without the milk) **and** *fixed composition* (the allergen set does not
vary instance to instance). A multi-ingredient **dish** assembled at eating time
fails the second test even when eaten from one bowl — `guláš`, `pizza`,
`polévka`, `sendvič` differ recipe to recipe, so no honest `allergenIds` exists.
A dish is therefore **never** a catalog Food: the mother either **decomposes** it
into its component Foods (`guláš` → `hovězí` + `cibule` + …) or logs it as a
free-text **custom food** (`other:guláš`, empty `allergenIds`, the honest-unknown
state below). A dish can never *graduate* into the catalog — there is no
deterministic allergen set to curate; asserting one would lie about the next
instance. The meal *is* the composition (`Meal.items` is a list); the Food is not.

**Principle — food allergen-curation is precision-biased: characteristic
ingredients only.** A Food's `allergenIds` are the **characteristic ingredients
of the standard product**, not every allergen any brand might contain. Excluded:
trace cross-contamination (oats are intrinsically gluten-free → `ovesné mléko` is
`[]`, never `wheat`, even though some brands cross-contaminate), optional
emulsifiers/additives (soy lecithin in `mléčná čokoláda` → not asserted), and
brand-variable add-ins. A *reliably-present second characteristic ingredient*
spawns a **separate named Food** (`oříšková čokoláda` → `[chocolate, dairy,
nuts]`), never a widened allergen set on the plain tile. This is the same
precision-bias ADR-0017 applies to harvest normalization and to the empty
`allergenIds` of custom foods: **never assert a trigger we are not sure of.** The
reason is diagnostic, not lazy — a substitute product's whole purpose is what it
replaces (`ovesné mléko` is reached for *to avoid* dairy), so over-tagging turns
the safe option red and trains the mother to ignore warnings (alarm fatigue),
which is worse for diagnosis than a rare missed trace. The recall safety-net is
the live-resolution + harvest machinery already described below: a genuinely
missed *characteristic* trigger learned later retroactively enriches every past
log; trace contaminants do not qualify, characteristic ingredients do.

**Principle — food granularity is earned, not exhaustive: split only on a
differential trigger or insight signal.** A distinct product earns its own Food
**only** when it differs from a sibling in either its `allergenIds` *or* its
likely reaction signal (different allergen expression / physiology — fermented vs
fresh, casein-heavy vs near-pure fat). **Cosmetic variants of the same substance
and processing class do not earn a tile.** `rohlík` is the same gluten and the
same processing as `pšeničný chleb` → one canonical wheat-bread food, not
bread + rolls + bagels. By contrast `jogurt` / `máslo` / `sýr` differ
physiologically (fermentation, casein:whey, fat) → each earns a tile, all sharing
`allergenIds: ['dairy']`. The allergen is the questionnaire/reintroduction unit
and is **never loggable**; the meal log always selects a concrete food, so an
allergen with no neutral home still needs **≥1 representative food** (you log
`pšeničný chleb`, never the allergen `wheat`). The bar is *one canonical food per
(allergen × meaningful form/physiology)*, not one per culinary product — granularity
serves insight resolution, not catalog completeness. The long tail of cosmetic
products is absorbed by custom foods (`other:`) and harvest, not by pre-seeding
every variant. (Dishes are excluded one level up by the atomicity + fixed-composition
rule; this rule governs the *atomic products that remain*.)

**A logged `MealItem` stores only its `foodId`; its triggers are resolved live
from the catalog, never snapshotted onto the meal.** Conflict detection is
already a derived, recomputed view (it was never a stored audit fact — only
`Meal` / `SkinObservation` / the verdict are), so resolving triggers live is
consistent with how conflicts already work. It is also the *intended* behaviour:
allergies here are **discovered, not acquired**, and a food's allergen content is
a fact we *learn* by curation. When the catalog improves — by curation or by a
`HarvestCandidate` graduating into a food — every past meal of that food
retroactively gains its triggers, surfacing a trigger eaten unknowingly. That
retroactive enrichment is a feature in a diagnostic elimination diet; a snapshot
would freeze stale knowledge and hide exactly the pattern the app exists to find.
(A food's *response* may also change — e.g. outgrowing milk — but that lives in
the schedule/verdict layer, which conflict detection already reads live.)

**Principle — the questionnaire selects allergens; the meal log selects
foods.** Both surfaces render through the same family-grid shell but bottom out
one level apart: the questionnaire stops at the **allergen** (drill into a
family, pick the allergen — `motherAllergies` / `babyConfirmedAllergies` /
`testedAllergens` are all allergen ids), while the meal log descends to the
**food**. The presentation `familyId` override lives only on foods, so the
questionnaire is unambiguous — `soy` always appears under `Luštěniny` there,
never under `Mléko`. Both surfaces resolve to the same allergen identity, which
is what links a declared allergy to a later logged food.

**Custom foods are the honest "unknown" state.** A free-text food with no
catalog match becomes a `CustomFoodId` (`other:${normalizedKey}`) with family
`Vlastní` and **empty** `allergenIds` — and the mother is **never** asked to
categorise it or tag its allergens (on-device curation is exactly the false-merge
risk ADR-0017 §5 pushed to the server). It asserts no trigger it isn't sure of.
The empty triggers are safe under live resolution: when the matching
`HarvestCandidate` graduates into a real food, past `other:…` logs retroactively
gain triggers and migrate out of `Vlastní`. The `Vlastní` tile surfaces
previously-typed customs for re-logging plus the free-text entry point.

### HarvestCandidate
A runtime record of a food the mother typed that is **not** in the canonical
catalog: a `normalizedKey`, every deduped `rawForms` surface form seen,
occurrence stats (`count`, `firstSeen`, `lastSeen`), and a `status`
(`pending | ingested`). Stored in a dedicated Dexie table, reactive via
`liveQuery`. The
candidate is the harvest feed and the eventual cross-user sync payload; it
*graduates* when a curation act mints a `CanonicalAllergen` whose `aliases`
cover its key. Harvest stats live only here, never on a `CanonicalAllergen`.
On-device normalization is deliberately minimal and precision-biased
(lowercase + trim + collapse whitespace, **keep** diacritics, **no** stemming);
authoritative clustering is a deferred server-side job. See
[ADR-0017](docs/adr/0017-allergen-catalog-storage-and-harvest.md).

### Actor
The person whose food intake a `Meal` describes. In v1 always `'mother'`
(the breastfeeding mother — allergens transit to the baby via breastmilk).
The `actor` field is reserved on `Meal` for future expansion to `'baby'`
once solids-introduction is in scope, but v1 writes only `'mother'`.

**Why the field exists now:** committing to dual-actor logic in v1 would
fork the schedule generator (mother eliminates X *and* baby solids skip X
on a different timeline). Reserving the field is cheap; retrofitting it
after data exists is a migration.

**Invariant:** every `Meal` has an `actor`. In v1, `actor === 'mother'`.

---

## Invariants

- **Single device, single actor.** v1 runs on one phone (the mother's).
  No accounts, no sync, no server. See [ADR-0001](docs/adr/0001-single-device-v1.md).
- **Encrypted manual export is the backup floor.** Every persisted record
  has a stable UUID. Whole-state serialize + AES-256-GCM with a
  passphrase-derived key is built in v1. Cloud/auto-backup is deferred.
  See [ADR-0002](docs/adr/0002-backup-floor.md).
- **Meals are day-granular.** `Meal` carries `date` + `mealType` only.
  No user-facing meal times. `createdAt` / `updatedAt` are system-stamped
  for audit. See [ADR-0003](docs/adr/0003-day-granular-meals.md).
- **One `Meal` per date+mealType slot.** A given `(date, mealType)` pair
  maps to exactly one `Meal` record. The record is upserted (not appended)
  when the user finalizes the working meal (the `Uložit` CTA). `Meal.id` is the deterministic
  composite key `"${date}:${mealType}"` (e.g. `"2026-05-27:lunch"`).
- **Causation is derived, not recorded.** The user logs only ground
  truth (meals, skin observations, end-of-phase reintro verdict). The
  app derives suspected patterns via a pattern detector over those
  logs. No `suspectedCause` field on `SkinObservation`.
  See [ADR-0004](docs/adr/0004-causation-derived-not-recorded.md).
- **Skin observation is a per-region severity set, atomically saved
  with photos.** `SkinObservation.regions` is a list of `{ id, level }`
  pairs over nine canonical regions and four absolute severity levels
  (klidné / mírné / střední / silné). Klidné is the explicit default.
  Day-overall severity is derived as `max(regions)` and never persisted.
  `SkinObservationRepository.save(observation, photos)` writes both in a
  single Dexie transaction.
  See [ADR-0021](docs/adr/0021-regional-severity-skin-observation.md).
- **Klidné regions persist as positive evidence; every save witnesses
  all nine regions.** Absence of an observation for the day means
  "didn't check"; an observation with every region at level 0 means
  "checked, all calm". The Uložit gate is removed — every `/skin` visit
  can save.
  See [ADR-0021, klidné amendment](docs/adr/0021-regional-severity-skin-observation.md#amendment--klidné-as-positive-evidence-2026-06-29)
  (originally filed as ADR-0022; merged 2026-06-30).
- **Observation `id` and `createdAt` are immutable across edit, delete,
  and undo-after-delete.** `createdAt` represents the *witnessing
  moment*, not the row's last-write timestamp; an edit (typo in a note,
  bumped severity) does not retroactively change when the parent looked
  at the skin. Delete is a hard delete cascading to all `SkinPhoto` rows
  for that observation. The repository port exposes `save` (compose),
  `update` (edit), `remove` (delete), `listByDate` (read).
  See [ADR-0021, edit-and-delete amendment](docs/adr/0021-regional-severity-skin-observation.md#amendment--edit-and-delete-preserve-identity-2026-06-30).
- **Photo encryption-at-rest deferred past v1** — with a shipping
  constraint: encryption must land before the app reaches any device
  other than the developer's own.
  See [ADR-0005](docs/adr/0005-photo-encryption-deferred.md).
- **Persistence: Dexie/IndexedDB, normalized tables.** Photos in a
  dedicated table. Reactive UI via `liveQuery`. The insight engine
  receives plain arrays — it does not know Dexie exists.
  See [ADR-0006](docs/adr/0006-dexie-persistence.md).
- **v1 ships the Protocol Executor.** Onboarding, today view, meal-add
  with conflict detection, day detail, program timeline, end-of-reintro
  verdict, encrypted export. Insight engine deferred to v1.1.
  See [ADR-0007](docs/adr/0007-v1-scope.md).
- **Tracer-bullet slice order**: (1) Onboarding + Today read-only, (2)
  Log a meal → see it on today, (3) Daily assessment + photo. Then the
  remaining v1 screens.
  See [ADR-0008](docs/adr/0008-tracer-bullet-slices.md).
- **Domain records carry types, not display strings.** Domain-emitted
  records (`SchedulePhase`, `MealItem`, etc.) carry stable type
  identifiers (e.g. `type: 'elimination'`). Czech display text and visual
  tokens live in `src/lib/strings/` (pure text) and `src/lib/config/`
  (text + visual tokens combined), resolved at render time. Baking
  a display string onto a domain record violates this invariant.
  See [ADR-0014](docs/adr/0014-presentation-strings-and-domain-keys.md).
- **Allergen catalog is data-first, bundled, and port-fronted.** Each allergen
  is one curated JSON-serializable `CanonicalAllergen` record; `AllergenId` and
  `ProtocolAllergenId` are *derived* from the records, not hand-written unions.
  Reintroduction capability is the optional `protocol` field — canonical does
  not imply reintroducible. Unknown user input becomes a runtime
  `HarvestCandidate` in Dexie, never mutates the bundled catalog. Cross-user
  aggregation and server-push are deferred behind `CanonicalCatalogPort`.
  See [ADR-0017](docs/adr/0017-allergen-catalog-storage-and-harvest.md).
