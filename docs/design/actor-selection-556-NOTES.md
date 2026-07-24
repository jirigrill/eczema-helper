# Prototype: meal-logging actor selection UX (issue #556)

**Question:** how does the mother pick mother-vs-child when composing a meal, gated by feeding stage? `breastfed`/`solids` auto-select a single actor (no picker); `mixed` needs a mother/child choice.

**Artifact:** `docs/design/actor-selection-556.html` — standalone (Tailwind CDN, no SvelteKit/service-worker). `open docs/design/actor-selection-556.html`; flip each phone to `mixed` to see the picker.

## Verdict — **A (Top pill row)**

Two full-width pills (`Já` / `Miminko`) under the header, shown **only in `mixed`**; `breastfed`/`solids` show no picker and no label (single actor is implicit, set in Settings via `feedingStage`).

> **Revised C → A.** The first pass picked C (content tabs) on the "tabs match the two-records model" nicety. Reconsidered under a component-reuse + design-system lens, A wins:

- **Reuse — no new component.** A is two `Chip.svelte` (the shipped `active: boolean` pill primitive) side by side. C and F both require net-new components (tabs / sliding-toggle track).
- **On-system.** DESIGN.md's entire selection vocabulary is pills/chips (line 434 "selection chip — inline pill"; line 581 "pills are full-rounded regardless of size"). There is no segmented-toggle-track pattern; tabs aren't a pill either. A *is* the documented idiom.
- **Shared with #553.** The Settings feeding-stage picker (breastfed/mixed/solids) becomes the same pill-group pattern — one established primitive covers both screens.
- **Typical user** (sleep-deprived breastfeeding mother, one-handed, own phone, several meals/day, misattribution corrupts conflict detection + ladder dose): full-width pills = big targets + easy reach, unmistakable active state.
- **No corner collision.** A sits full-width under the header, nowhere near the top-right ⋯ delete-menu (which killed F and B).

**Cost:** A reclaims the slot ADR-0018 emptied when meal-type pills were removed — but that removal was about meal-type being fixed-at-entry, not a rule that the slot stays empty. An actor picker is a different purpose.

## Flagged for further grilling — swap-on-dirty (#562)

Undecided, and **orthogonal to the visual choice** — it applies to A, C, and F equally (any in-screen actor switch). If she has **unsaved** foods on `Já` and taps `Miminko`, does the app **warn / autosave / discard**? The two pills are backed by two separate records (`date:mealType:actor`), so switching swaps working state — mishandled, a tired mother silently loses just-entered foods or lands them on the wrong actor. Only D (dual compose) and E (fixed-at-entry) would sidestep it. Tracked as its own grilling ticket, #562.

## Scope

This map (#552) is planning-only — no production code ships here. The standalone HTML is the design asset. Folding A into `/meal` (reusing `Chip.svelte`) is a follow-up execution effort; that PR should also delete these two mockup files.
