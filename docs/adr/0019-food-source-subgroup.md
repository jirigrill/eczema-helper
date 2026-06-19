# ADR-0019: Food-source subgroup as a second presentation axis

## Status

Accepted

## Context

The meal-log family drill-in (`FamilyDrillIn.svelte`) groups a family's foods by
their **allergen trigger** (`[...new Set(foods.flatMap(allergenIds))]`), with a
`bez alergenu` section for neutral foods and a `!` badge on any eliminated-today
allergen header.

Two problems surface as the catalog grows (the curation feedback roughly triples
several families — `Mléko` ~5 → ~18 foods, `Zelenina`, `Ovoce`, `Obiloviny`):

1. **The allergen axis scatters divergent foods.** A food's `familyId` and
   `allergenIds` are independent (see CONTEXT.md, presentation-vs-domain). Under
   allergen grouping, `mandlové mléko` lands under *Ořechy* and `sójové mléko`
   under *Sója* — away from where a mother scanning `Mléko` looks for them. The
   18-food dairy family collapses into one undifferentiated *Mléčná bílkovina*
   wall (kravské + ovčí + kozí), since they share the `dairy` allergen.
2. **`bez alergenu` reads as a safety claim.** It means only *not-in-catalog*,
   yet presents as *safe* — and every baby's triggers differ. False reassurance.

A throwaway prototype (`/proto-foods`, since deleted) compared three layouts at
three family sizes:

- **A** — group by allergen-trigger (status quo).
- **B** — flat list; per-food red `Vyloučeno` styling carries all danger signal.
- **C** — group by a **food-source** axis the mother thinks in (Kravské / Ovčí /
  Kozí / Rostlinné; S lepkem / Bez lepku).

At small sizes (eggs, 3 foods) all three are identical — grouping only matters
once a family is large, which is exactly where A breaks.

## Decision

Adopt **C with a family-level collapse threshold**, replacing allergen-trigger
grouping on the meal-log drill-in.

1. **New presentation axis `sourceGroup`.** Foods gain an optional
   `sourceGroup?: string` field (a key, e.g. `'cow'`, `'plant'`, `'gluten'`),
   independent of `familyId` and `allergenIds`. It decides *clustering within a
   family*, nothing else. Like `familyId`, it is presentation only and never
   enters the conflict-detection path.

2. **Per-family, ordered labels in the strings layer.** A new
   `src/lib/strings/family-sources.ts` holds `familySources`, keyed by
   `FamilyId` to an **ordered array** of `{ key, label }`. The array order is the
   render order (Kravské → Ovčí → Kozí → Rostlinné is curated, not alphabetical).
   `satisfies Partial<Record<FamilyId, readonly SourceGroup[]>>` — only families
   large enough to group need an entry. Per ADR-0014, the domain record carries
   the key; the Czech label lives here.

3. **Grouping is a progressive enhancement.**
   `grouped = family.foods.length >= 5 && familySources[familyId] != null`.
   A family that is small, or large-but-not-yet-curated, renders **flat**
   (variant B). The catalog stays shippable at every curation stage — no
   big-bang "tag all foods first."

4. **Unmatched foods → trailing `Ostatní` bucket.** In a grouped family, any food
   whose `sourceGroup` is undefined (or an unlisted key) renders in a trailing
   `Ostatní` section. It carries **no safety claim** — danger remains per-food.
   This replaces, and is narrower than, the old `bez alergenu` section.

5. **Implicit, not an explicit `'other'` key.** `sourceGroup` undefined is the
   only "unsourced" state; we do **not** mint a legal `'other'` value. Gap
   detection is a **dev-only `console.warn`** when a grouped family's `Ostatní`
   bucket outgrows its largest authored group — a signal the axis is wrong (add a
   group), not the food.

## Alternatives considered

- **Keep A (allergen grouping).** Rejected: scatters divergent foods, walls large
  single-allergen families, and the `bez alergenu` false-safety problem.
- **B everywhere (always flat).** Honest and simplest, but an 18-item scroll with
  no landmarks. C degrades to exactly this for small/uncurated families, so we
  keep B's simplicity where it wins without losing landmarks where they help.
- **Derive source from `familyId` or `allergenIds`.** Impossible: all dairy
  sources share `familyId: dairy`; kravské/ovčí/kozí share the `dairy` allergen.
  Source is genuinely a third axis.
- **Per-group collapse (merge <5-food groups into `Ostatní`).** Rejected: turns
  `Ostatní` into a meaningful-looking catch-all and muddies the axis. Whole-family
  collapse is cleaner.
- **Explicit `'other'` key for lint coverage.** Rejected: tempts lazy tagging that
  hides axis-rot behind reviewed-looking `'other'`; adds a globally-meaningless key
  to per-family arrays; renders identically to `undefined` so users never see the
  distinction; and `satisfies` can't enforce per-food source coverage anyway (still
  a runtime/test check). The dev-warn gives the gap signal without the permanent
  schema cost.

## Consequences

- `FamilyDrillIn` iteration inverts: it walks the **ordered `familySources` array**
  for the family, not `Set(foods.flatMap(allergenIds))`. Presentation order is
  authored in one place.
- A new presentation concept enters the domain language (CONTEXT.md updated;
  `UBIQUITOUS_LANGUAGE.md` gains *source subgroup* / `sourceGroup` / `Ostatní`).
- Catalog curation gains a per-family task: author `familySources` order + tag
  foods. Untracked until done, the family just renders flat — no breakage.
- `bez alergenu` is removed; the false-safety surface is gone.
- A fat `Ostatní` bucket is the (manual + dev-warn) signal that a family's source
  axis needs another group, not that its foods are wrong.

## Render-order rules

Once `sourceGroup` exists, two further sub-decisions follow about *what order*
groups and foods render in:

### Foods within a group: **alphabetical (Czech locale)**

Foods inside a single `sourceGroup` are *peers* — `Borůvky` and `Maliny` carry
no inherent rank. Sort by Czech name (`localeCompare(name, 'cs')`) at render
time. Predictable, language-correct, future-foods-safe (no per-food order
authoring). The same rule applies to flat (ungrouped) families.

`FOODS` keeps its §3a/§3b/§3c/§3d sectioning so the editorial narrative of
*why* each row exists is preserved; sort happens in `FamilyDrillIn.svelte`.

### Source groups within a family: **curated, eliminated-sinks-last**

Source groups are *not* peers. `Kravské` is the entire mainstream dairy axis,
`Kozí` is a niche specialty, `Rostlinné` is a different category surface
entirely. Alphabetical sort produces visibly weird results (`Kozí` first in
dairy, `Bez lepku` first in grains) because alphabetical treats unequal items
as equal.

The render order is the *curated* `familySources[familyId]` array order —
authored editorially, frequency-biased: the group most-encountered in
everyday CZ use comes first.

The render layer additionally **sinks fully-eliminated groups** to the
bottom: a group whose every food carries an eliminated allergen renders
below non-eliminated groups. Rationale: a parent on an active elimination
protocol is *avoiding* the eliminated group; sinking it reduces scrolling
for the foods they actually log. Stable sort preserves curated order among
non-eliminated groups; among eliminated groups; and the trailing `Ostatní`
bucket always renders last regardless.

The predicate is **`every food in the group carries at least one eliminated
allergen`** (conservative). A mixed group keeps its curated position. This
degenerates safely across all 5 axes:

- `dairy` with `dairy` eliminated: all of cow/sheep/goat sink uniformly,
  `Rostlinné` floats up. Optimal.
- `grains` with `wheat` eliminated: only `psenice` carries `wheat`;
  `oves`/`jecmen`/`zito` don't, so `S lepkem` group does **not** sink. The
  individual `Pšenice` tile still dims via `eliminatedStatus="danger"`. (A
  future predicate could map group-key → defining allergen for a more
  aggressive sink; not done because the cost/benefit doesn't justify a new
  mapping table for one family's edge case.)
- `fruit`/`nuts-seeds`/`fish-seafood`: mixed-allergen groups → no sink.
