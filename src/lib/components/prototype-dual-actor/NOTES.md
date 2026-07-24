# Prototype: day-view dual-actor slot layout

Ticket: [Day-view dual-actor slot layout (mother + child shown separately)](https://github.com/jirigrill/eczema-helper/issues/557)
Map: [Dual-actor meals: mother and child as distinct dietary actors](https://github.com/jirigrill/eczema-helper/issues/552)

## Question

How does a day-view slot render both the mother's and the child's meal
separately?

**Layout: settled.** Winner of the first round (six variants: split
columns, stacked rows, accordion, twin cards, actor tabs, accordion-spaced)
is **stacked rows** — each eligible actor gets its own always-visible row
under a shared slot header. Refined per human feedback:

- Actors are labelled **"Já"** and **"Miminko"**, not "Matka"/"Dítě".
- Each row keeps the trailing **"›"** arrow into the meal editor.
- A conflict allergen is shown **once per meal section**, deduplicated
  across both actors, instead of repeated per actor row.
- Foods are plain wrapping text (no chips/pills) — nothing is ever
  truncated or cut off, regardless of item count (fixture varies 1/3/5
  items per slot) or name length.
- Collapses to today's exact single-row `MealCard` look (no tag, no header
  split) when only one actor is eligible for the current `?stage=`.

**Still open: the empty-actor-slot treatment.** When one actor has logged a
meal and the other hasn't, what does the empty row look like? Four options,
cycled via `?empty=1-4`:

1. `"+ Zapsat"` — primary-colored link text (explicit CTA)
2. `"Nezapsáno"` — muted descriptive text, no CTA emphasis
3. Dashed CTA pill — `"+ Přidat"` in a primary-tinted dashed pill (reuses
   DESIGN.md's `card-empty-cta` pattern)
4. `"+"` icon only — no words, minimal (closest to today's single-actor
   `MealCard` empty state)

**Easiest way to test:** open `docs/design/prototype-dual-actor-slots.html`
directly in a browser — no dev server, no seeded IndexedDB data. The real
`/day/[date]?dualActor=1&empty=1-4&stage=` wiring stays useful for seeing it
sit against the *real* app chrome.

## Verdict

_Empty-state choice not yet recorded — awaiting human reaction (this is a
HITL ticket per the wayfinder map's ticket-type convention; the agent
doesn't pick for the user)._ Flip through `?empty=1-4` ×
`?stage=breastfed/mixed/solids` on `/day/<any-date>?dualActor=1`, then
record here (or directly on issue #557) which empty-state option wins, or
which bits to combine. Once decided:

- Delete `PrototypeSwitcher.svelte`, the `?dualActor=`/`?empty=` branch in
  `+page.svelte`, and `docs/design/prototype-dual-actor-slots.html`.
- Fold the winning layout into `MealCard.svelte` for real, wired to real
  per-actor `Meal` data (this prototype's mock data goes away entirely).
