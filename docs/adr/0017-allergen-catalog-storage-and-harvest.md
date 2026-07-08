# 0017 — Allergen Catalog Storage and Harvest Pipeline

**Status:** Accepted (amended by [ADR-0023](0023-dose-escalation-ladder.md))
**Date:** 2026-06-08 (revised 2026-06-10)
**Amends:** [ADR-0014](0014-presentation-strings-and-domain-keys.md) (data-first inversion of the catalog structure)

> **Amendment (ADR-0023, 2026-07-08):** the `protocol` field on
> `CanonicalAllergen` and its supporting types (`AllergenProtocol`,
> `ProtocolDay`) are retired. Reintroduction data now lives on a `ladder`
> field of type `Ladder` (per-stage `LadderStep[]`). The derived id union
> `ProtocolAllergenId = Extract<ALLERGENS[number], { protocol: object }>['id']`
> is renamed `LadderAllergenId = Extract<ALLERGENS[number], { ladder: object }>['id']`
> — same construction, new name reflecting the new discriminant. References
> below to `ProtocolAllergenId`, `{ protocol: object }`, and the `protocol`
> field describe the pre-amendment shape; the *reason* they exist (data-first
> derivation, one record per allergen) is unchanged.

> **Revision (2026-06-10) — three-level restructure (family / allergen / food).**
> The catalog originally shipped as a single collection of allergen records whose
> `subitems` were bare strings owned by one record. Two pressures broke that
> shape: (a) the meal-log grid showed overlapping sibling tiles at mixed
> granularity (`citrus` / `strawberries` / `fruit` / `exotic-fruit` as siblings),
> and (b) composite foods (`hummus` → chickpea + sesame) cannot be parented to a
> single allergen. The catalog is now **three collections — families, allergens,
> foods**: a presentation grouping *above* the clinical allergen layer, and
> first-class foods *below* it. Crucially, **`protocol` stays on the allergen** —
> it is *not* pushed down to foods — so the reintroduction engine is unchanged;
> the family layer is inserted above it and the food layer below it. §1, §2, §4
> and the file layout are revised accordingly. The data-first, port-fronted, and
> deliberately-dumb-normalization decisions (§3, §5) are unchanged. The
> family/allergen/food vocabulary and its two invariants live in `CONTEXT.md`.

## Context

The canonical allergen set is 13 slugs hand-written as the `ProtocolAllergenId`
string-literal union in `models.ts`, with four parallel files declaring
`satisfies Record<ProtocolAllergenId, …>` against it — `data/categories.ts`
(structure), `strings/categories.ts` (Czech name), `config/categories.ts`
(icon), and `data/reintroduction-protocols.ts` (clinical schedule). Adding one
allergen means four coordinated edits.

Two pressures break this shape:

1. **Scale.** The intended catalog is tens-to-hundreds of allergens, categories,
   and subitems. At that size the four-parallel-file structure is a maintenance
   tar pit, even though it compiles.
2. **A harvest destiny.** User-added items (today the crude `other:${string}`
   tier) should eventually feed a shared canonical catalog aggregated across
   users and pushed back to clients. That is **deferred, speculative, and
   backend-dependent** — it reverses [ADR-0001](0001-single-device-v1.md) and is
   out of v1 scope — but the storage shape chosen now must not block it.

A third fact constrains the design: the current union welds two unrelated jobs
together. An allergen needs *elimination & logging* metadata (name, icon —
any food qualifies, crowdsourceable) and, separately, a *reintroduction
protocol* (a graded oral-challenge schedule with doses and an evaluation day —
medical content, authored by a curator, never crowdsourceable). Only the
clinical few have the latter; the type forces all 13 to have it.

## Decision

**The canonical catalog is authored data-first in TypeScript, bundled at build
time, and read through a port. A separate runtime Dexie store collects harvest
candidates. Reintroduction capability is decoupled from category membership.**

### 1. Three collections — family, allergen, food — each data-first

The catalog is three authored, JSON-serializable collections, each the source of
truth for its level; the identifier types are *derived* from the data, never
hand-written:

```ts
export const FAMILIES   = [obiloviny, ovoce, mleko, /* … */]      as const;
export const ALLERGENS  = [dairy, eggs, citrus, /* … */]          as const;
export const FOODS      = [sojoveMleko, pomeranc, hummus, /* … */] as const;

type FamilyId           = typeof FAMILIES[number]['id'];
type AllergenId         = typeof ALLERGENS[number]['id'];
type LadderAllergenId   = Extract<typeof ALLERGENS[number], { ladder: object }>['id'];
type FoodId             = typeof FOODS[number]['id'] | CustomFoodId;
```

The three levels (vocabulary + invariants in `CONTEXT.md`):

- **Family** — presentation bucket / grid tile, `{ id, icon }`. One
  non-overlapping tile per food family. No protocol, no clinical meaning.
- **Allergen** — the reintroduction unit, `{ id, familyId, ladder? }`. Carries
  the optional `ladder`, owns `AllergenStatus`, is what `LadderAllergenId`,
  `SchedulePhase.allergenIds`, and the engine refer to. Belongs to exactly one
  family. This is the original allergen record **minus** its inlined `subitems`.
- **Food** — first-class loggable entity, `{ id, familyId, allergenIds, aliases }`.
  `allergenIds` is its trigger set: zero (`rýže`), one (`pomeranč` → `[citrus]`),
  or several (`hummus` → `[chickpea, sesame]`). Its `familyId` is presentation and
  may differ from any trigger's family (`sójové mléko` → family `Mléko`,
  `allergenIds [soy]`). `FoodId` is **flat** — the old `allergenId:bare`
  `SubitemId` scheme is retired, because a food with several triggers has no
  single parent to name it.

Adding an item is **one record** in the right collection with its fields
co-located; a missing field is a structural error on that one object.

**File layout** — one file per record (clean diffs, reviewable curation units for
clinical content), aggregated per collection by the index:

```
src/lib/data/allergen-catalog/
  families/    obiloviny.ts  ovoce.ts  mleko.ts  …
  allergens/   dairy.ts  citrus.ts  meat.ts (no ladder)  …
  foods/       sojove-mleko.ts  pomeranc.ts  hummus.ts  …
  index.ts     // FAMILIES / ALLERGENS / FOODS, each `as const`
               // derives + exports FamilyId / AllergenId / LadderAllergenId / FoodId
```

Each record is `… as const satisfies Family | Allergen | Food` **and** each array
is `[…] as const` — both load-bearing: `satisfies` checks the shape, `as const`
preserves the literals the union derivation needs (otherwise ids widen to
`string` and the unions collapse). The id types are derived in `index.ts` (next
to the data) and **re-exported through `models.ts`** so existing
`$lib/domain/models` import sites do not churn.

### 2. Ladder stays on the allergen; foods reference allergens

`ladder` is **optional** on an *allergen* record and stays there — it is **not**
pushed down to foods. Its presence derives `LadderAllergenId`; only those
allergens enter reintroduction phases. The reintroduction engine
(`LadderAllergenId`, `SchedulePhase.allergenIds`, the `reintro-` / `retest-`
phase-id scheme) is therefore **unchanged** by this restructure — the family
layer is inserted *above* it, the food layer *below* it.

The food↔allergen relation is **many-to-many**: one allergen is expressed by many
foods; one food may trigger several allergens. **Conflict detection resolves only
through a food's `allergenIds`** — a food conflicts if *any* of its allergens is
eliminated — never through its family.

A logged `MealItem` stores only its **`foodId`**; its `allergenIds` are
**resolved live from the catalog, never snapshotted** onto the meal. This is
safe because conflicts are already a derived, recomputed view (never a stored
audit fact — only `Meal` / `SkinObservation` / the verdict are), and it is the
*intended* behaviour: allergies are discovered, not acquired, so a food's
allergen content is a fact we *learn* by curation. When the catalog improves —
by curation or by a `HarvestCandidate` graduating into a food — every past meal
of that food retroactively gains its triggers, surfacing a trigger eaten
unknowingly. A snapshot would freeze stale knowledge and hide exactly the
pattern a diagnostic elimination diet exists to find. (`MealItem.id` is the
deterministic composite `${date}:${mealType}:${foodId}`, mirroring the
one-meal-per-slot key.)

**The meal log records foods, never allergens directly.** A directly-eaten
allergen gets a *food twin*: food `vejce` → `allergenIds [eggs]`; the allergen
`eggs` itself is never logged. The small redundancy keeps the rule uniform
("logging = foods") and mirrors the single-allergen-family UI collapse.

This still expresses the tier the original union lacked — **canonical, loggable,
not reintroducible** — now as a food whose `allergenIds` is empty or points only
at protocol-less allergens.

### 3. TS now, JSON-serializable shape, port-fronted

The catalog ships **bundled and build-time** as TS — preserving compile-time
literal-union safety, which costs nothing today. (Confirmed cheap: only test
fixtures branch on literal allergen ids; production code treats them as opaque
data, so the union guards *data authoring*, not code correctness.)

The catalog is read through `CanonicalCatalogPort`. Today the only adapter
returns the bundled records. The records are kept **plain JSON-serializable
data** (no functions, no class instances) so that the deferred server-push is a
contained change, not a rewrite.

**The flip trigger is named:** the day a server can push catalog updates
*between releases*, `AllergenId` can no longer be a closed compile-time union
(runtime data will carry ids the bundle never saw). At that point — and not
before — add a runtime schema validator (validating server-pushed catalog as
external input per the security rule in `CLAUDE.md`), emit a snapshot via
`JSON.stringify(ALLERGEN_CATALOG)`, swap in the remote adapter, and widen `AllergenId` to
a branded `string`. The port isolates the blast radius. Until that trigger
fires, the catalog stays TS. We do **not** fund the server-push pipeline early.

### 4. Canon vs candidate — two stores, two jobs

- **Canonical catalog** — curated, mostly-immutable, bundled TS (above).
- **`HarvestCandidate`** — runtime, mutable, a new Dexie table
  ([ADR-0006](0006-dexie-persistence.md)), reactive via `liveQuery`. Shape:
  `{ normalizedKey, status, count, firstSeen, lastSeen, rawForms }` — the deduped
  raw user input (`rawForms`), the normalized key, occurrence stats, and a
  `status` of `'pending' | 'ingested'` (`ingested` is reserved for the
  not-yet-built curation pass). This is the harvest feed and the eventual sync
  payload. Harvest stats live **here**, never on a catalog record.

  Concretely a `version(5)` table in `src/lib/db/atopic-db.ts` (current head is
  `version(4)`), keyed by the normalized key with a `status` index:
  `harvest_candidates: '&normalizedKey, status'`. Reached through a session
  store + adapter in the same shape as `mealSession` /
  `DexieMealRepository`, so routes never touch `db` directly.

The **normalized key is the join** between the two worlds. A candidate
graduates when a curation act mints a **food** record (with its `familyId` and
`allergenIds`) whose `aliases` cover its key — not a new allergen, since most
harvested items are foods expressing already-known allergens, not new clinical
units.

Until it graduates, a typed-but-unmatched food is a `CustomFoodId`
(`other:${normalizedKey}`) parked in the **`Vlastní`** family with **empty**
`allergenIds`, and the mother is **never** prompted to categorise it or tag its
triggers — on-device tagging is the same false-merge hazard §5 pushes to the
server. The empty trigger set is safe precisely because triggers resolve live
(§2): graduation retroactively enriches every past `other:…` log.

### 5. Client normalization is deliberately dumb; smart merging is server-side

On-device normalization is precision-biased and minimal:

```
normalize(s) = s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
// KEEP diacritics. NO stemming. NO synonym resolution. Store every raw form in rawForms.
```

The client's only jobs are deduping one mother's repeated typing and emitting a
clean `rawForms` payload. Czech lemmatization, declension folding, and synonym
clustering are an authoritative **server-side** job over the full corpus —
deferred with the rest of the backend. In an elimination diet a **false merge
is worse than a missed merge** (a wrongly-folded food could mask a real
trigger), so the on-device rule never merges forms that might differ; duplicate
candidates are acceptable and reconciled later.

Canonical records carry `aliases: string[]` (normalized forms) so free-text
input matching a known food logs against it and produces **no** spurious
candidate. The alias list also backs meal-log autocomplete.

### 6. Provenance on the record

Each record carries an optional free-text `source` (clinical citation, or
promotion provenance like `'harvested:2026-06'`). A harvested item is promoted
*into* a real record by a curation act; provenance is recorded in `source`, not
as a separate origin flag. Czech `name` stays in `strings/` (ADR-0014 i18n
separation); `icon`, `subitems`, `protocol`, `aliases`, `source` are
locale-independent and co-located on the record.

**Superseded sub-decision (2026-06-09):** an earlier draft of this section gave
each record an `origin: 'core' | 'regional'` "clinical class" flag. It was
dropped: no code ever read it, the only behavioral question it gestured at
(reintroducibility) is already *derived* from `protocol` presence (§2), and
"regional" mislabelled the everyday staple foods the catalog now carries
(potato, pork, onion). Provenance lives in `source`; tier is derived from
`protocol`. If a non-derived classifier is ever needed (e.g. UI grouping
"major allergens" vs "everyday foods"), add a purpose-named field with a real
consumer at that point.

## Alternatives Considered

- **Catalog as runtime JSON + schema now.** Correct *the day* server-push ships,
  but pre-pays its cost (loses the free compile-time union) for a speculative,
  deferred destiny. Rejected until the flip trigger fires.
- **Move the whole catalog into Dexie, seeded on first run.** Maximum runtime
  flexibility, but discards literal-union typing across the domain for data that
  changes a few times a year at release cadence. Premature.
- **CSV.** No typing, no nesting, no compile-time coverage. Out.

## Consequences

- **Positive:** Adding an allergen is one co-located record; the catalog scales
  to hundreds without parallel-file drift. Compile-time safety is retained for
  free today. The reintroducible/loggable distinction becomes expressible. The
  harvest destiny is unblocked behind a port without being funded early.
- **Positive (2026-06-10 restructure):** The grid shows one non-overlapping tile
  per family; composite foods with multiple triggers become expressible; and the
  reintroduction engine is untouched because `protocol` stays on the allergen.
  The presentation/domain split (`familyId` vs `allergenIds`) keeps grid
  placement from leaking into conflict detection.
- **Negative (2026-06-10 restructure):** The single allergen collection splits
  into three (`families/`, `allergens/`, `foods/`); the `allergenId:bare`
  `SubitemId` scheme is retired for flat `FoodId`s; directly-eaten allergens need
  a food twin (`vejce` → `[eggs]`); and `strings/` gains a family-name key set
  alongside the existing allergen/food names. No Dexie migration — foundation
  build, no production data (the cheap window).
- **Negative:** Amends ADR-0014 — the catalog structure inverts from
  union-first (four `satisfies Record<>` files) to data-first (records derive
  the union), and `icon`/`protocol`/`aliases` co-locate onto the record rather
  than living only in `config/`/`data/`. The `strings/` i18n separation is
  preserved.
- **Negative:** A new Dexie table and a normalization function enter the
  codebase ahead of any consumer UI for harvest review. Acceptable as the
  "lay the infrastructure" deliverable.
- **Deferred:** the server, cross-user aggregation, the runtime schema
  validator, and the remote catalog adapter. None are built here; the shape
  merely permits them.
