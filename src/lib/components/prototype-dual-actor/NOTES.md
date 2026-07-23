# Prototype: day-view dual-actor slot layout

Ticket: [Day-view dual-actor slot layout (mother + child shown separately)](https://github.com/jirigrill/eczema-helper/issues/557)
Map: [Dual-actor meals: mother and child as distinct dietary actors](https://github.com/jirigrill/eczema-helper/issues/552)

## Question

How does a day-view slot render both the mother's and the child's meal
separately? Three structurally different layouts, switchable via
`?variant=A|B|C` and `?stage=breastfed|mixed|solids` on the real `/day/[date]`
route (mother's meals are real data; the baby side is mocked in `mock-data.ts`
since #554's actor-keyed migration is decided but not yet built).

- **A — Split columns.** Each slot divides into two columns (reuses the
  existing "Smím / Vyhýbej se" `grid-cols-2 divide-x` primitive already on
  this page). Actor label sits as an eyebrow atop each half.
- **B — Stacked rows.** Each eligible actor gets its own always-visible row
  under a shared slot header, tagged with a small "Matka"/"Dítě" pill.
- **C — Accordion.** Slot stays a single collapsed summary row
  ("Matka: ... · Dítě: ...") until tapped; opens to two full rows.

All three collapse to today's exact single-row `MealCard` look (no split, no
tag, no chevron) when only one actor is eligible for the current
`?stage=` — satisfying the breastfed/solids single-actor case from the
ticket's question.

## Verdict

_Not yet recorded — awaiting human reaction (this is a HITL ticket per the
wayfinder map's ticket-type convention; the agent doesn't pick for the
user)._ Flip through `?variant=A/B/C` × `?stage=breastfed/mixed/solids` on
`/day/<any-date>`, then record here (or directly on issue #557) which one
wins, or which bits of each to combine. Once decided:

- Delete the losing variants, `PrototypeSwitcher.svelte`, and the `?variant=`
  branch in `+page.svelte`.
- Fold the winning layout into `MealCard.svelte` for real, wired to real
  per-actor `Meal` data (this prototype's mock data goes away entirely).
