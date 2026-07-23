# Prototype: meal-logging actor selection UX (issue #556)

**Question:** how does the mother pick mother-vs-child when composing a meal, gated by feeding stage? `breastfed`/`solids` auto-select a single actor (no picker); `mixed` needs a mother/child choice.

Throwaway code lives inline in `src/routes/meal/+page.svelte`, guarded by `import.meta.env.DEV` and searchable via `PROTOTYPE (#556)`. Not wired to `MealEditor`/Dexie/`Meal.actor` — `protoActor` is local view state only, and `FeedingStage` is faked via `?stage=` since it doesn't exist in the domain yet (map #552).

## Try it

**Easiest — standalone file, no dev server:** `open docs/design/actor-selection-556.html`.
All three variants render side by side, each with its own `breastfed|mixed|solids` toggle and
clickable actor control. Sidesteps the dev PWA service worker + onboarding redirect that make
hard-navigating to `/meal?...` unreliable under `bun run dev`.

**In-app (fiddly):** `bun run dev`, reach `/meal` via the day-view FAB (not a direct URL —
the dev service worker's `navigateFallback: '/'` intercepts fresh navigations and the root
layout bounces you to `/day/<today>`), then use the DEV-only switcher pill (top-right) or
`?variant=`/`?stage=` params.

## Three variants

- **A — Top pill row.** Full-width `Já`/`Miminko` pill pair in the exact slot the old meal-type pills occupied (removed by ADR-0018), directly under `PageHeader`. In `breastfed`/`solids` it collapses to a muted one-line caption ("Zapisujete za: …") instead of disappearing silently.
- **B — Compact header badge.** A single `Chip` next to the date in `PageHeader`'s `right()` snippet; tapping it flips the actor in place. Smallest footprint — treats the picker as a rare, secondary affordance rather than a first-class row. Single-actor stages show a plain (non-interactive) label instead of the chip.
- **C — Integrated content tabs.** A two-tab strip (`Já` / `Miminko`) above the confirmed-foods list, scrolling with content rather than living in the sticky header. Frames the choice as "which working list am I looking at" rather than a settings-like toggle. Single-actor stages get an eyebrow line ("Krmíte: …") in the tab's place.

## Riskiest assumptions (flag before picking)

1. **Placement.** A reclaims real estate ADR-0018 deliberately emptied — worth confirming that's acceptable before resurrecting a pill row there. C moves the decision out of the sticky header entirely, which changes how "loud" the choice feels.
2. **Czech copy.** `Já` / `Miminko` are placeholders, not vetted strings — final copy belongs in `src/lib/strings/` regardless of which variant wins.
3. **Swap-on-dirty behavior (not shown in the mockup).** Once real actor plumbing exists, switching actors mid-compose means swapping to a *different* `WorkingMeal` for the same `date:mealType` slot (key is `date:mealType:actor` per #554). None of these variants demonstrate a dirty-state guard — whether switching away from an unsaved mother-meal warns, autosaves, or silently discards is undecided and should be resolved as part of (or right after) picking a variant.
4. **Threading through `MealEditor`.** All three variants assume the actor becomes route-level view state (like `drilledFamily` today) that gets passed into `editor.open`/`finalize`, mirroring how `mealType` used to work pre-ADR-0018. Not prototyped here — this is state-shape, not look-and-feel.

## Verdict

_Unfilled — for the human to pick a variant (or a hybrid) in a follow-up conversation on issue #556._

## Cleanup

Once a verdict is recorded, delete this file and every `PROTOTYPE (#556)` block in `+page.svelte`, then fold the winning variant into real code as a follow-up (not part of this wayfinder map, which is planning-only).
