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
- A conflict allergen is shown **once per meal section**, deduplicated
  across both actors, instead of repeated per actor row.
- Foods are plain wrapping text (no chips/pills) — nothing is ever
  truncated or cut off, regardless of item count (fixture varies 1/3/5
  items per slot) or name length.
- Collapses to today's exact single-row `MealCard` look (no tag, no header
  split) when only one actor is eligible for the current `?stage=`.

**Empty-actor-slot treatment: settled** — a single **"+"** (was option 4 of
four candidates: "+ Zapsat" link / "Nezapsáno" muted / dashed CTA pill /
"+" icon). Minimal, matches today's single-actor `MealCard` empty state.

**Section arrow: settled** — a single **"›"** vertically centered against
the whole meal section (one tap target into the meal editor), not one arrow
per actor row.

**Easiest way to test:** open `docs/design/prototype-dual-actor-slots.html`
directly in a browser — no dev server, no seeded IndexedDB data. It shows
the three fill states (completely empty / one actor only / both actors). The
real `/day/[date]?dualActor=1&stage=` wiring stays useful for seeing it sit
against the *real* app chrome.

## Verdict

**Layout, empty state, and section arrow are all settled** (see above).
Once merged/actioned:

- Delete `PrototypeSwitcher.svelte`, the `?dualActor=` branch in
  `+page.svelte`, and `docs/design/prototype-dual-actor-slots.html`.
- Fold the winning layout into `MealCard.svelte` for real, wired to real
  per-actor `Meal` data (this prototype's mock data goes away entirely).
