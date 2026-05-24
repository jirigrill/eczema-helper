# ADR-0011 — Semantic Colour Opacity Tiers: `/5`, `/15`, and the `[data-state]` banner scale

**Status:** Accepted  
**Date:** 2026-05-24  
**Closes:** #80

## Context

The `[data-state]` CSS block in `app.css` standardises **banner-strength** tints at the `/10`–`/40` range, combining background + border + text colour into a single atomic class. Two additional opacity tiers appear repeatedly in the codebase and prototype but had never been named:

| Tier | Tailwind suffix | Affected sites |
|------|----------------|----------------|
| **Subtle tint** | `/5` | Severity-choice cards (not-selected), training-band background (`program/+page.svelte:437`), non-selected meal item (`meal/+page.svelte:239`), `card-empty-cta` background, `task-tile-done` surface |
| **Icon/selection background** | `/15` | Phase step-number circles (`phase-display.ts:7–10`), meal-type avatars, selected chips (`CategoryGrid.svelte:198`), insight tag pills (per DESIGN.md §Insight Cards) |

Note: `EczemaCheck.svelte:104` uses `bg-success/20` for the saved-button state — this is slightly above the `/15` icon tier; it is canonically `/20` (part of the `[data-state]` banner scale) and should not be migrated.

## Decision

Approve `/5` and `/15` as two **named semantic tiers** distinct from the `[data-state]` banner scale. Document them in `DESIGN.md`. No new CSS classes or `[data-state]` modifiers are introduced.

**Tier semantics:**

- **`/5` — subtle contextual tint.** The surface is *associated* with a colour but is neither selected nor alarming. Used for passive decorative backgrounds (empty-CTA invite, not-selected choice card, done-tile surface). Background only; no border or text colour change.
- **`/15` — icon / selection background.** An element is *actively representing* that colour's meaning. Two sub-patterns:
  - **Icon container** (circular/avatar): background `/15` only; text at full semantic opacity. Used for phase step-number circles, meal-type avatars.
  - **Selection chip** (inline pill): background `/15` + text at full semantic opacity + border `/30`. Used for selected allergen chips, insight tag pills.

The `[data-state]` scale (`/10`–`/40`) remains for **banner-level** components where background + border + text are set together (InfoBanner, status chips, etc.).

## Rationale

- The prototype (`docs/design/redesign-prototype.html`) uses both tiers consistently and intentionally; collapsing them would require visual regression across every screen.
- `DESIGN.md` already references 5% and 15–20% alpha in component descriptions; this ADR merely elevates them to named tiers.
- Extending `[data-state]` with `-subtle` / `-active` modifiers (Option 1) would force border + text co-changes onto elements that only need a background tint — wrong abstraction.
- Collapsing to `/10` / `/12` (Option 3) would visually flatten the not-selected state of choice cards and icon containers relative to selected/active elements, harming the interaction model.

## Consequences

- `DESIGN.md §Color Usage Rules` is updated to name and define these tiers.
- A follow-up AFK migration issue (#82 or equivalent) will audit every `/5` and `/15` site against this definition and fix any outliers.
- `EczemaCheck.svelte:104` (`bg-success/20`) is confirmed correct and excluded from migration.
