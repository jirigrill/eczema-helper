# Prototype: day-view dual-actor slot layout

Ticket: [Day-view dual-actor slot layout (mother + child shown separately)](https://github.com/jirigrill/eczema-helper/issues/557)
Map: [Dual-actor meals: mother and child as distinct dietary actors](https://github.com/jirigrill/eczema-helper/issues/552)

## Question

How does a day-view slot render both the mother's and the child's meal
separately? Six structurally different layouts, switchable via
`?variant=A|B|C|D|E|F` and `?stage=breastfed|mixed|solids` on the real
`/day/[date]` route (mother's meals are real data; the baby side is mocked
in `mock-data.ts` since #554's actor-keyed migration is decided but not yet
built). Foods render as plain wrapping text — no chips/pills on food items
(dropped after human review); nothing is ever truncated or cut off,
regardless of item count (fixture varies 1/3/5 items per slot) or name
length.

**Easiest way to test:** open `docs/design/prototype-dual-actor-slots.html`
directly in a browser — no dev server, no seeded IndexedDB data, plain
static HTML/JS re-implementing the same six variants with fixture data.
The `/day/[date]?variant=` wiring below stays useful for seeing the layout
sit against the *real* app chrome once you've picked a favorite.

- **A — Split columns.** Each slot divides into two columns (reuses the
  existing "Smím / Vyhýbej se" `grid-cols-2 divide-x` primitive already on
  this page). Actor label sits as an eyebrow atop each half.
- **B — Stacked rows.** Each eligible actor gets its own always-visible row
  under a shared slot header, tagged with a small "Matka"/"Dítě" pill.
- **C — Accordion.** Slot stays a single collapsed summary row
  ("Matka: ... · Dítě: ...") until tapped; opens to two full rows.
- **D — Twin cards.** Each actor gets its own bordered card, stacked
  full-width, for maximum breathing room per actor.
- **E — Actor tabs.** A segmented control ("Matka" / "Dítě") above the whole
  meal list switches which actor's full slot list is shown — never combines
  both actors in one row at all.
- **F — Accordion, spaced.** Same interaction as C, but the two expanded
  groups get generous vertical space and a divider between them instead of
  sitting close together.

All six collapse to today's exact single-row `MealCard` look (no split, no
tag, no chevron) when only one actor is eligible for the current
`?stage=` — satisfying the breastfed/solids single-actor case from the
ticket's question.

## Verdict

_Not yet recorded — awaiting human reaction (this is a HITL ticket per the
wayfinder map's ticket-type convention; the agent doesn't pick for the
user)._ Flip through `?variant=A-F` × `?stage=breastfed/mixed/solids` on
`/day/<any-date>`, then record here (or directly on issue #557) which one
wins, or which bits of each to combine. Once decided:

- Delete the losing variants, `PrototypeSwitcher.svelte`, the `?variant=`
  branch in `+page.svelte`, and `docs/design/prototype-dual-actor-slots.html`.
- Fold the winning layout into `MealCard.svelte` for real, wired to real
  per-actor `Meal` data (this prototype's mock data goes away entirely).
