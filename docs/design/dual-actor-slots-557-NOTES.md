# Prototype: day-view dual-actor slot layout (issue #557)

**Question:** how does a day-view meal slot render the mother's and the child's meal separately, once meals are per-actor (map #552)? Per-actor conflict badges, empty states, and the single-actor collapse when only one actor is eligible for the current `FeedingStage`.

**Artifact:** `docs/design/dual-actor-slots-557.html` — standalone (Tailwind CDN, no SvelteKit/service-worker). `open docs/design/dual-actor-slots-557.html`; the switcher cycles `FeedingStage` (breastfed / mixed / solids) to see the single-actor collapse. Shows the three fill states — completely empty, one actor only, both actors.

## Verdict — **APPROVED (2026-07-24)**

**Stacked rows** under one meal-section header — each eligible actor gets its own always-visible row:

- **Actor marker:** a fixed-width **round icon** (not a text tag, so rows stay aligned) — a **woman with a side ponytail** for the mother, a **seated baby in a diaper** for the child.
- **Foods:** plain wrapping text, never truncated (works with 1 / 3 / 5+ items and long names) — chips/pills were rejected in an earlier round.
- **Conflict allergen:** shown **once per meal section**, deduplicated across both actors — not repeated per row.
- **Empty state:** a single **"+"**. Both actors empty → the section collapses to one "+"; one actor empty → that row shows a "+".
- **Row indicators:** each row's indicator sits in one fixed-width **right rail**, so an empty actor's **"+"** lines up in the same column as a logged actor's **"›"** (into the meal editor).
- **Single-actor collapse:** when only one actor is eligible for the `FeedingStage` (breastfed → mother only, solids → baby only), the slot renders as today's single-row `MealCard` — no icon, no header split.

The layout beat five alternatives in the first round (split columns, accordion, twin cards, actor tabs, accordion-spaced). Actor labels started as text tags "Já"/"Miminko"; replaced by icons because the differing tag widths misaligned the rows.

## Scope

This map (#552) is planning-only — no production code ships here. The standalone HTML is the design asset. Folding this layout into `MealCard` is a follow-up execution effort **gated on #554** (the `MealId` → `${date}:${mealType}:${actor}` migration that provides real per-actor `Meal` data; this prototype fabricates the baby side). That PR should also delete this mockup file.
