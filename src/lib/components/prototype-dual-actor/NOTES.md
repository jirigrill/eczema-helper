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

- Each actor is marked by a **fixed-width round icon** (not a text tag, so
  rows stay aligned): a **woman with a side ponytail** for the mother, a
  **seated baby in a diaper** for the child.
- A conflict allergen is shown **once per meal section**, deduplicated
  across both actors, instead of repeated per actor row.
- Foods are plain wrapping text (no chips/pills) — nothing is ever
  truncated or cut off, regardless of item count (fixture varies 1/3/5
  items per slot) or name length.
- Collapses to today's exact single-row `MealCard` look (no icon, no header
  split) when only one actor is eligible for the current `?stage=`.

**Empty-actor-slot treatment: settled** — a single **"+"**. When both actors
are empty the whole section collapses to one "+"; when only one actor is
empty, that row shows a "+".

**Row indicators: settled** — each row's indicator lives in one fixed-width
right rail so the empty-actor **"+"** lines up in the same column as the
logged-actor **"›"** (into the meal editor).

**Easiest way to test:** open `docs/design/prototype-dual-actor-slots.html`
directly in a browser — no dev server, no seeded IndexedDB data. It shows
the three fill states (completely empty / one actor only / both actors). The
real `/day/[date]?dualActor=1&stage=` wiring stays useful for seeing it sit
against the *real* app chrome.

## Verdict

**APPROVED (2026-07-24)** — layout, actor icons, empty state, and row
indicators are all settled (see above). `docs/design/prototype-dual-actor-slots.html`
is the durable design record.

Production fold-in is gated on **#554** (the `MealId` →
`${date}:${mealType}:${actor}` key migration that gives real per-actor
`Meal` data — this prototype fabricates the baby side). Once #554 lands:

- Fold this layout into `MealCard.svelte` for real, wired to real per-actor
  `Meal` data (this prototype's mock data goes away entirely).
- Delete `PrototypeSwitcher.svelte` and the `?dualActor=` branch in
  `+page.svelte` (the `docs/design/` HTML can stay as the design reference).
