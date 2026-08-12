# 0028 — Preparation methods live on the food, not on a coarse form bucket

## Overview

Every food in the catalog now says *exactly* which ways it can be prepared. A
banana offers "syrové / pečené / vařené / sušené"; a salmon offers "syrové /
vařené / pečené / uzené / smažené"; milk offers "syrové / vařené / pečené". The
list is per food, hand-authored alongside the food's other data.

This replaces the old `FoodForm` scheme, where each food picked one of four
buckets (`none` / `liquid` / `cookable` / `raw-only`) and the bucket decided the
chips. That model was wrong in both directions at once: it showed "smažené" on
foods you never fry (banana, oils, berries — the `cookable` bucket was a
grab-bag of ~100 foods), and it had no way to express the preparations an
elimination-diet mother actually distinguishes — **sušené** (dried fruit),
**uzené** (smoked fish), **naložené** (cured meat). The same source ingredient
prepared those ways is a materially different food to log, and the bucket model
could not say so.

The fix is to drop the bucket abstraction and let the food carry its own
preparation list. `PreparationMethod` gains `dried`, `smoked`, and `cured`; a
food that supports them simply includes them in its list. There is no separate
"variant" record for smoked salmon and no clutter of near-duplicate tiles — you
find the base food and pick how it was prepared.

---

**Status:** Accepted
**Date:** 2026-08-10
**Issue:** [#356](https://github.com/jirigrill/eczema-helper/issues/356)

## Context

Preparation was modelled in two decoupled places:

- **`FoodForm`** (`none` / `liquid` / `cookable` / `raw-only`) on each catalog
  food record, mapped to a chip subset by `formPreparations`
  (`src/lib/domain/preparation-rules.ts`).
- **`PreparationMethod`** (`raw` / `boiled` / `baked` / `fried`) captured
  optionally on a logged `MealItem`, unconstrained at write time (#314).

Auditing the catalog (163 foods) showed the bucket model failing on both edges:

- `cookable` held ~101 foods and offered `fried` to all of them, including ~25
  fruits, ~10 fats/oils, and several cheeses/grains that are never fried in the
  sense a mother logs. The wrong chip went unnoticed only because preparation
  feeds nothing downstream — allergen matching is parked (`allergen-matching`),
  so an inert "fried banana" chip misled no code.
- `liquid` (10 foods) was tight and meaningful — all drinks, `cookable` minus
  `fried` — but that one real distinction did not justify a four-value enum that
  was otherwise a poor approximation.
- The three preparations the issue set out to model — **dried** (švestka →
  sušená švestka), **smoked** (losos → uzený losos), **cured** (vepřové → šunka)
  — are orthogonal to physical form. They attach to specific solid foods
  regardless of whether the food is liquid or raw-only, so they cannot be
  encoded as form buckets without a combinatorial explosion
  (`smokeable`, `dryable`, `curable`, `liquid-smokeable`, …).

Two options survived scrutiny:

- **Keep `FoodForm`, add a specialty-prep field.** Rejected: the union of
  `formPreparations[form]` + specialty preps can only *add* chips, so it cannot
  remove the wrong `fried` from fruit without a second subtract-list — at which
  point it is strictly more complex than authoring the list directly.
- **Collapse to a per-food list.** Chosen.

The catalog is already fully hand-authored data, so making preparation explicit
per food is data entry, not new machinery — and the machinery it removes
(`FoodForm`, `formPreparations`, `formForFood`) is a net simplification.

## Decision

**Preparation applicability is a per-food property.** Each catalog food carries
an explicit `preparations: PreparationMethod[]` listing exactly the methods that
make sense for it, in chip-display order.

- `PreparationMethod` becomes
  `['raw', 'boiled', 'baked', 'fried', 'dried', 'smoked', 'cured']`
  (`src/lib/domain/models.ts`). `preparationStrings`
  (`src/lib/strings/preparations.ts`) gains the three Czech labels: `dried` →
  **Sušené**, `smoked` → **Uzené**, `cured` → **Naložené**. (`steamed`/Dušené is
  **not** added — see below.)
- `FoodForm`, `formPreparations`, and `formForFood`
  (`src/lib/domain/preparation-rules.ts`) are **deleted**. The `form` field is
  removed from every food record and replaced with `preparations`.
- The meal-log UI reads `food.preparations` directly instead of resolving a form
  to a chip subset. Custom user-typed foods (`other:*`, never in `FOODS`) keep
  their current permissive default — the full everyday set
  `['raw', 'boiled', 'baked', 'fried']`.
- The stored `MealItem.preparationMethod` remains a single optional
  `PreparationMethod` and remains unconstrained at write time (#314 unchanged) —
  this decision governs *which chips the UI offers per food*, not what a stored
  meal may hold.

**Variants are not separate records.** A smoked salmon is `losos` with `smoked`
in its list, not a sibling `uzeny-losos` food. This preserves the "one tile per
source ingredient, pick the preparation" read and avoids category clutter. The
existing sibling records that predate this (dairy: `jogurt` / `tvaroh` / `syr` /
`smetana` next to `kravske-mleko`) are **left as-is** — they are distinct foods
by their own right, not preparation variants, and re-parenting them is out of
scope.

**`steamed` / Dušené is dropped from the documentation, not added to the code.**
`UBIQUITOUS_LANGUAGE.md` described a five-method model (with `steamed`/Dušené)
the code never implemented. The code is the source of truth; the doc is
corrected to the real method set. (The lone `cabbage-brassica:cooked-cabbage` →
'Dušené zelí' string is an unrelated catalog subitem label and is untouched.)

## Consequences

- Each food's chips are exactly right: no `fried` on bananas, `dried`/`smoked`/
  `cured` available precisely where they belong, and cooking fats/oils carry an
  empty list — like drinks and condiments, they are staples you cook *with*, not
  foods logged by preparation.
- The migration is mechanical and lossless: every current `form` expands to its
  `formPreparations` array as the food's starting `preparations`, then the
  arrays are hand-corrected (prune `fried` from fruit, empty the list for cooking
  fats/oils, add specialty preps to the fish/fruit/meat that take them). This
  touches all 163 food records.
- `FoodForm` and its resolver are removed; call sites (food editor, family
  drill-in, meal log) read `preparations` directly. `grep -rn "FoodForm\|formPreparations\|formForFood\|\bform:" src/` must come back clean of the old scheme.
- Custom-food harvest is **unchanged** — free text (e.g. "sušené švestky") still
  mints an `other:*` custom food with the permissive default chip set. Steering
  free text toward canonical catalog entries is a separate search/UX concern and
  is explicitly **not** opened by this decision.
  > **No longer true as of [#662](https://github.com/jirigrill/eczema-helper/issues/662).**
  > Custom food and harvest were removed; there is no free-text food entry. The
  > decision this ADR records is untouched — preparation applicability still lives
  > on the food record — and `DEFAULT_PREPARATIONS` survives only as a defensive
  > fallback for a food id absent from the catalog, no longer as the custom-food path.
- Preparation still feeds nothing downstream (matcher parked). If
  `allergen-matching` is later revived, it reads the new shape; the
  `docs/parked-features.md` revive note for it should be checked at that time.
- The three orphaned prep-flavoured `subitemStrings`
  (`potato:boiled-potato`, `potato:potato-dumplings`, `potato:fried-potato`) —
  dead entries with no catalog referent — are deleted as part of this work.
- **Catalog invariant preserved (folded in from #507).** 22 records still carry a
  `ladder` object whose `allergenId` duplicates the record `id`, read by nothing
  at runtime. Because this change touches every food record, a catalog invariant
  test must assert `record.id === record.ladder.allergenId` for every
  ladder-bearing record and pass afterwards; if any ladder-bearing allergen is
  renamed or re-parented, its `ladder.allergenId` is updated in the same commit.
  Out of scope (parked with `tolerance-building`): the `StoredLadder` type split
  and anything touching `ladder_overrides` or the Dexie version block.
