# ADR-0020 — Meal Slot Rows Are Tappable Add-Entry Points

**Status:** Accepted  
**Date:** 2026-06-19

## Context

The day-view FAB (Floating Action Button) submenu was the only path to start a new meal entry. This follows the principle "writes go via FAB only, cards are passive" that was the default for all day-view cards.

The redesigned `MealCard` (issue #321) renders all four meal slots unconditionally. An unlogged slot self-identifies its meal type by showing the slot's icon and label alongside a `+` indicator.

## Decision

Unlogged meal-slot rows in `MealCard` are tappable links that navigate directly to `/meal?type=<slot>&date=<date>&returnTo=/day/<date>`, pre-selecting the meal type in the editor.

This diverges deliberately from the "FAB-only writes" principle for this one card:

- A slot row already displays the meal type — tapping it is a natural affordance.
- The FAB submenu requires two taps (open submenu → pick type) for a meal the user has not yet logged that day. The slot row collapses this to one tap.
- The FAB remains available as the global add path and still handles skin observations, photos, and any meal type.

## Consequences

- Unlogged slot rows carry a `data-testid="meal-row-<type>"` anchor tag with the pre-populated href.
- The FAB submenu meal-type options remain; both paths lead to the same editor URL.
- Future cards that adopt a similar "self-identified empty slot" pattern may extend this exception, but must record it explicitly.
