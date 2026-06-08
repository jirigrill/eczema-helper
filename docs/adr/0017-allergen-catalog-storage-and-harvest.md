# 0017 — Allergen Catalog Storage and Harvest Pipeline

**Status:** Accepted
**Date:** 2026-06-08
**Amends:** [ADR-0014](0014-presentation-strings-and-domain-keys.md) (data-first inversion of the catalog structure)

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

### 1. Data-first catalog; derive types from data

Each allergen is one self-contained, JSON-serializable record. The records are
the source of truth; the identifier types are *derived* from them:

```ts
export const CATALOG = [dairy, eggs, /* … */] as const;
type AllergenId         = typeof CATALOG[number]['id'];
type ProtocolAllergenId = Extract<typeof CATALOG[number], { protocol: object }>['id'];
```

Adding an allergen is **one record** with all its fields co-located; a missing
field is a structural error on that one object. Edit surface drops from four
files to two (catalog record + Czech name in `strings/`, see §5).

**File layout** — one record per allergen (clean diffs, reviewable curation
units for clinical content), aggregated by an index:

```
src/lib/data/catalog/
  dairy.ts        // export const dairy = { … } as const satisfies CanonicalAllergen
  eggs.ts
  paprika.ts      // origin:'regional', no protocol  ← not-reintroducible tier
  …
  index.ts        // export const CATALOG = [dairy, eggs, …] as const
                  // derives + exports AllergenId / ProtocolAllergenId
```

Each record is `… as const satisfies CanonicalAllergen` **and** the array is
`[…] as const` — both are load-bearing: `satisfies` checks the shape, `as const`
preserves the literals the union derivation needs (otherwise `id` widens to
`string` and the union collapses). The id types are derived in
`catalog/index.ts` (next to the data, since data-first inverts the dependency)
and **re-exported through `models.ts`** so existing `$lib/domain/models` import
sites do not churn. The legacy `data/categories.ts`, `data/reintroduction-protocols.ts`,
and the `ProtocolAllergenId`/`SubitemId` unions in `models.ts` are subsumed by
this directory.

### 2. Protocol decoupled — the third tier

`protocol` is **optional** on a catalog record. Its *presence* is what derives
`ProtocolAllergenId`. This introduces the missing tier — **canonical, loggable,
not reintroducible** — which is the honest state of most long-tail foods and the
landing tier for a harvested item. `ProtocolAllergenId` shrinks to the derived
subset that carries a protocol; only those enter reintroduction phases.

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
`JSON.stringify(CATALOG)`, swap in the remote adapter, and widen `AllergenId` to
a branded `string`. The port isolates the blast radius. Until that trigger
fires, the catalog stays TS. We do **not** fund the server-push pipeline early.

### 4. Canon vs candidate — two stores, two jobs

- **Canonical catalog** — curated, mostly-immutable, bundled TS (above).
- **`HarvestCandidate`** — runtime, mutable, a new Dexie table
  ([ADR-0006](0006-dexie-persistence.md)), reactive via `liveQuery`. Carries the
  raw user input, a normalized key, and occurrence stats
  (`count`, `firstSeen`, `lastSeen`, `status`). This is the harvest feed and the
  eventual sync payload. Harvest stats live **here**, never on a catalog record.

  Concretely a `version(5)` table in `src/lib/db/atopic-db.ts` (current head is
  `version(4)`), keyed by the normalized key with a `status` index:
  `harvest_candidates: '&normalizedKey, status'`. Reached through a session
  store + adapter in the same shape as `mealSession` /
  `DexieMealRepository`, so routes never touch `db` directly.

The **normalized key is the join** between the two worlds. A candidate
graduates when a curation act mints a canonical record whose `aliases` cover its
key.

### 5. Client normalization is deliberately dumb; smart merging is server-side

On-device normalization is precision-biased and minimal:

```
normalize(s) = s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
// KEEP diacritics. NO stemming. NO synonym resolution. Store every raw form in raw[].
```

The client's only jobs are deduping one mother's repeated typing and emitting a
clean `raw[]` payload. Czech lemmatization, declension folding, and synonym
clustering are an authoritative **server-side** job over the full corpus —
deferred with the rest of the backend. In an elimination diet a **false merge
is worse than a missed merge** (a wrongly-folded food could mask a real
trigger), so the on-device rule never merges forms that might differ; duplicate
candidates are acceptable and reconciled later.

Canonical records carry `aliases: string[]` (normalized forms) so free-text
input matching a known food logs against it and produces **no** spurious
candidate. The alias list also backs meal-log autocomplete.

### 6. Classification and provenance on the record

Each record carries `origin: 'core' | 'regional'` and an optional free-text
`source` (clinical citation, or promotion provenance like `'harvested:2026-06'`).
There is **no `'harvested'` origin**: a harvested item is promoted *into* a real
`core`/`regional` record by a curation act; `origin` means "clinical class of
the food," not "how it arrived." Czech `name` stays in `strings/` (ADR-0014
i18n separation); `icon`, `subitems`, `protocol`, `aliases`, `origin`, `source`
are locale-independent and co-located on the record.

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
