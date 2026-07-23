# Prototype: meal-logging actor selection UX (issue #556)

**Question:** how does the mother pick mother-vs-child when composing a meal, gated by feeding stage? `breastfed`/`solids` auto-select a single actor (no picker); `mixed` needs a mother/child choice.

**Artifact:** `docs/design/actor-selection-556.html` — standalone (Tailwind CDN, no SvelteKit/service-worker). `open docs/design/actor-selection-556.html`; flip each phone to `mixed` to see the picker.

## Verdict — **C (Content tabs)**

Two underline tabs (`Já` / `Miminko`) above the compose content, shown **only in `mixed`**; `breastfed`/`solids` show no picker and no label (single actor is implicit, set in Settings).

Chosen over the alternatives (A top pill row, D dual compose, E fixed-at-entry, F sliding toggle top-right) because, for the typical user — sleep-deprived breastfeeding mother, one-handed, own phone, logs several meals/day, misattribution corrupts conflict detection + the ladder dose:

- Tabs **match the data model**: `date:mealType:actor` = two genuinely separate records, so "switch between two lists" is literal, not metaphor.
- Large, clearly-labelled targets; unmistakable active state → low misattribution risk.
- No corner collision. (F and B both fought the ⋯ delete-menu, which renders top-right whenever `editingExisting && !drilledFamily`.)

**Build note:** pin the tabs into the **sticky header** so the current actor stays visible while composing (in the mockup they scroll away with content).

## Flagged for further grilling — swap-on-dirty

Undecided, and it bites tabs harder than any other option (tabs invite mid-compose switching): if she has **unsaved** foods on `Já` and taps `Miminko`, does the app **warn / autosave / discard**? Because the two tabs are backed by two separate records, switching swaps working state — mishandled, a tired mother silently loses just-entered foods or lands them on the wrong actor. Tracked as its own grilling ticket on the map (#552).

## Scope

This map (#552) is planning-only — no production code ships here. The in-app `+page.svelte` instrumentation was reverted; the standalone HTML above is the design asset. Folding C into `/meal` is a follow-up execution effort.
