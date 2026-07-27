# Prototype: copy-meal flow — entry point & destination picker (issue #593)

**Question:** how does the mother invoke "copy this meal" and then choose the destination, as one
continuous flow (**tap copy → pick day + slot**)? Two independent halves to react to.

**Artifact:** `docs/design/copy-meal-flow-593.html` (+ `copy-meal-flow-593.js`) — standalone
(Tailwind CDN, no SvelteKit / service worker). `open docs/design/copy-meal-flow-593.html`; each half
has a switcher bar at the top to flip between variants.

Locked constraints honoured throughout (from map #592): one general copy action · same-actor only ·
merge-on-occupied (no modal, occupied slots stay pickable + marked "sloučit") · no future-day targets.

## Variants offered

**Half 1 — entry point** (where copy lives + the gesture):

- **A · Ikona na řádku** — explicit copy glyph inline on the `MealCard` row, beside the `›` chevron.
  One tap, always visible. Adds a second action to the row.
- **B · ⋯ menu** — an overflow `⋯` on the row opens a bottom action sheet; "Kopírovat do…" is one
  item. Row stays clean, two taps, scales to future row actions (delete, duplicate).
- **C · V editoru jídla** — no affordance on the day view; copy is a footer action *inside* the meal
  editor (where `›` already leads). Least prominent, no row widening.

**Half 2 — destination picker** (day + slot in one step):

- **A · Mřížka dnů → slot** — pick a day from a grid of day tiles; the 4 slots expand under the
  chosen day. Future days greyed + "nelze".
- **B · Seznam dnů + sloty** — each past/today day is a row showing all 4 slots inline; one tap =
  day + slot at once. Future days omitted entirely. Longer scroll, fastest single choice.

Both destination pickers show occupied slots as pickable, tinted, and labelled **"sloučit"** — the
merge-on-occupied decision made visible; no modal.

## Verdict (2026-07-27)

**Half 1 — entry point: LOCKED → C · V editoru jídla.** Copy lives as the "…" (overflow) option
inside `MealEditor`. No affordance on the day view; no row widening. Variants A (row icon) and B
(row ⋯ menu) are rejected.

**Half 2 — destination picker: none of A/B accepted.** Grid-then-slot and day-list-with-slots both
rejected. Fresh options generated (D–G below) — awaiting user reaction to pick one.

New picker directions (see the "Destination picker — round 2" switcher in the prototype):

- **D · Stejný slot, jiný den** — the source meal type (Oběd) is pre-selected; the mother mainly
  picks a *day* (the common case is same-slot cross-day). Slot is a one-tap override, not a
  first-class step.
- **E · Rychlé cíle (včera / předevčírem)** — recency shortcut chips for the most likely targets,
  with a "jiný den" fallback into a full picker. Optimises the frequent case to a single tap.
- **F · Režim vložení (paste mode)** — no in-picker calendar; copying arms a "paste mode" and the
  mother navigates the normal day view to the target day, where every slot shows a paste affordance
  (empty → "vložit sem", occupied → "sloučit sem"). Reuses the day view she already knows.
- **G · Datum + slot (stepper)** — minimal: a Czech date stepper (‹ 4. 5. ›) hard-bounded at today,
  plus 4 slot chips. Compact, no scrolling, explicit.
- **H · Válce — den × typ** (user idea) — two independent iOS-style vertical wheels side by side:
  a **day** wheel and a **mealtype** wheel, each scrolling under a fixed centre selection band; the
  intersection of the two centred rows is the target cell. Day wheel is clipped at today (can't
  scroll into the future); mealtype wheel pre-centred on the source slot. Occupied target →
  confirmation reads "sloučit".


<!-- Fill in the chosen entry variant + chosen picker variant, plus any tweaks, then this
     prototype feeds the spec ticket (#597). Delete these mockup files once folded in. -->

## Scope

Map #592 is planning-only — no production code ships from this prototype. The standalone HTML/JS is
the design asset. It fabricates the day view, meal editor, and a fixed calendar (today = Po 5. 5.);
none of it touches real `Meal` data. The chosen variants feed the hand-off spec (#597); the
implementer deletes these mockup files when folding the flow into `MealCard` / the meal editor.
