# 0019 — Meal type is a mutable attribute of the working list, with move/switch-away semantics

**Status:** Proposed
**Date:** 2026-06-12
**Related:** [ADR-0018](0018-meal-commit-gate-and-undo.md) · [ADR-0003](0003-day-granular-meals.md) · PRD: [issue #242](https://github.com/jirigrill/eczema-helper/issues/242)

## Context

Today the meal-type pills (Snídaně / Oběd / Svačina / Večeře) are a **slot
selector**: tapping one autosaves the current slot and loads that slot's stored
foods. The refactored flow needs the pill to instead answer "what *is* this meal
I'm building" — the mother often realizes mid-logging that the foods are lunch,
not breakfast. That reframes meal type as a **mutable attribute of the single
in-memory working list**, not a key that swaps which list is shown.

The cost of that reframe: two working lists can contend for one slot (the foods
I'm building want to be lunch, but a finalized lunch already exists). The old
one-list-per-slot guarantee no longer holds, so the collision needs an explicit
rule rather than a silent merge or overwrite.

## Decision

**Meal type is an attribute of the working list. Collisions are made unreachable
(block), not resolved.** Pill behaviour depends on whether the working list is
empty:

- **Working list empty** → tapping a pill **loads** that slot for viewing/editing
  (the only way to open an already-finalized meal from this screen).
- **Working list non-empty:**
  - tap an **empty** pill → **MOVE**: relabel the working foods to that type and
    **empty the source** slot. Foods relocate (not clone); nothing is lost; no
    prompt.
  - tap a **filled** pill (a slot holding a finalized meal) → **SWITCH-AWAY**: load
    that meal, abandoning the current unfinalized working list. This is the only
    pill action that destroys data, so it is guarded by the
    [ADR-0018](0018-meal-commit-gate-and-undo.md) discard/undo.

A MOVE can therefore only land on free ground; merge and overwrite onto an
occupied slot are both unreachable by construction.

**Visual** reuses the food-token vocabulary: plain = empty slot, bordeaux
**outline** = current type, bordeaux **fill** = a slot with a finalized meal.

## Consequences

- Autosave-on-pill-switch is removed; switching no longer persists anything
  ([ADR-0018](0018-meal-commit-gate-and-undo.md) owns persistence).
- Once a food is added to the working list, jumping directly to *edit* a different
  already-finalized meal is a SWITCH-AWAY (load + abandon current), guarded by undo
  — there is no in-place "merge into the other meal."
- "Slot is occupied" is derived from finalized meals for the date (Dexie), so the
  pill's filled/empty state and the family-grid's active state read from the same
  persisted facts.
- Pill state + move/switch-away logic is encapsulated in a `MealTypePills` wrapper
  over the (extended) `Chip`, keeping the occupancy logic testable in one place.
