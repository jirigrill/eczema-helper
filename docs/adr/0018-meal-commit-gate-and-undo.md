# 0018 — Meal logging lifecycle: commit-gate, fixed-type entry, explicit delete

**Status:** Accepted
**Date:** 2026-06-14
**Accepted:** 2026-06-15
**Revised:** 2026-06-15 — finalize-CTA relabelled `Hotovo` → `Uložit` and the discard
toast made *dirty-aware* (a clean edit no longer claims a discard). The commit-gate
*decision* is unchanged; only the user-facing label and the discard-trigger condition
moved. See "Revision: label + discard accuracy" below.
**Supersedes:** [ADR-0019](0019-meal-type-mutable-with-move-semantics.md) (merged here)
**Related:** [ADR-0003](0003-day-granular-meals.md) · [ADR-0006](0006-dexie-persistence.md) · PRD: [issue #242](https://github.com/jirigrill/eczema-helper/issues/242)

## Context

The `/meal` flow builds a **working meal** in memory — foods accumulate in a working
list before anything is written — and the day page shows the finalized meals for a
date. Three questions had to be answered together, because the answer to each
constrains the others:

1. **When** does the working list become a persisted `Meal`?
2. **How** is the meal's type (Snídaně / Oběd / Svačina / Večeře) chosen, and what
   happens if the mother wants a *different* meal than the one she is composing?
3. **How** is a whole meal deleted?

An earlier pair of decisions (this ADR's first revision, plus ADR-0019) answered #2
by making meal type a **mutable attribute** of the working list: the meal-type pills
could MOVE the draft onto an empty slot or SWITCH-AWAY onto a filled slot (abandoning
the draft, guarded by undo). That model was reversed during a design review (see
"Reversed approach" below): a single control that both *relabels a draft* and
*destructively navigates into another meal* was the main source of friction, and the
collision machinery it required (`occupiedTypes`, `loadedFromType`, MOVE-empties-source)
existed only because a draft and a finalized meal could contend for one slot.

## Decision

The meal lifecycle is **`/meal` composes exactly one meal; the day page views all
meals and launches into them.** Three rules:

### 1. Commit-gate — only the finalize CTA persists

The working meal lives in memory until finalized. Drill-in confirmations and family
commits mutate only the in-memory working list; nothing is written to Dexie until the
**finalize CTA** is tapped. A meal is therefore a deliberate, finished artifact — the day
overview never shows a half-built draft.

- **Finalize CTA label (mode-aware).** The button is **`Uložit`**, not `Hotovo` — the
  same verb the food/family sub-CTAs use (`Uložit {Food}` / `Uložit {Family}`), so the
  whole screen reads as one "Uložit {what}" ladder. It adapts to mode to keep create vs
  update legible (a saved meal can never duplicate — `Meal.id` is the upserted
  `"${date}:${mealType}"`, [ADR-0003](0003-day-granular-meals.md)):
  - **Compose-new:** `Uložit {MealType}` (e.g. "Uložit Oběd") — naming the type is
    truthful, the mother is creating that meal.
  - **Editing-existing, dirty:** `Uložit změny` — communicates *update this meal*, not
    create a second one. The meal type is dropped (the sticky page header already shows
    it; repeating it would re-introduce the "saving a second lunch?" ambiguity).
  - **Editing-existing, clean:** `Uložit změny`, disabled — nothing to save; leave via
    back.
- **Persist point:** the finalize CTA writes the `Meal` to Dexie and navigates to
  `returnTo`. On an **edit-update** it preserves the original `createdAt` and stamps
  `updatedAt`; only a compose-new write mints a fresh `createdAt`. Success needs no toast
  — the destination day overview renders the saved meal immediately via live query, which
  is its own receipt. A *failed* write surfaces an error `Toast` and keeps the user on
  `/meal`, so a non-empty working meal is never silently lost to a persistence error.
- **Empty finalize is blocked.** Finalizing a zero-food working list does nothing
  (composing) or is rejected with a hint (editing — "a meal needs at least one food;
  use Smazat to remove it"). Deleting a meal is never done by emptying it.

> **Implementation note.** This lifecycle is implemented by the `MealEditor` module
> (`src/lib/stores/meal-editor.svelte.ts`) — see PRD [issue #284](https://github.com/jirigrill/eczema-helper/issues/284).

### 2. Meal type is fixed at entry; the day page is the launcher

Meal type is chosen **before any food is added** and is **fixed** for that composing
session. There is no mid-add type change and no in-`/meal` slot switching. Because type
is bound at entry, a draft and a finalized meal can never contend for a slot —
collisions are impossible *by construction*, not blocked by a rule.

- **Entry points (both land on `/meal?type=X&date=…&returnTo=…`):**
  - The **day-page FAB** opens a submenu of the four `MealType`s. An already-logged
    type carries a ✓; tapping it **edits** that meal. Tapping an unlogged type opens an
    **empty** compose session for it. The FAB is **day-scoped** (bound to the day page's
    `selectedDate`), so backfilling an earlier day keeps working.
  - **Tapping a finalized meal row** on the day page (`MealCard`) opens it for editing —
    direct manipulation for "I see the mistake, I tap it."
- Both routes resolve to the *same* loaded-for-edit state; there is one code path.

> **Implementation note.** The planning issue (#265) proposed a new `MealTypeFab`
> component for the launcher. It shipped instead as a meal-type **submenu inside the
> existing `FabActionSheet`** (the global "+" sheet already hosting the photo/skin
> actions): a `mealSubmenuOpen` branch plus a `loggedTypes` prop for the ✓ markers. The
> submenu is the second face of one bottom sheet — it shares the sheet shell, backdrop
> and `onclose` contract — so it is not a standalone component, and there is no
> `MealTypeFab.svelte`. Its tests live in `FabActionSheet.test.ts` (colocated with the
> source). Extract a standalone picker only if a second surface ever needs the
> meal-type list without the surrounding launcher actions.

### 3. Delete is explicit, edit-mode-only, undo-protected

A "Smazat jídlo" action appears **only when editing an existing meal**, behind the
header overflow (⋯) + a confirm sheet. It calls the repository `remove`, navigates to
`returnTo`, and offers the same undo toast as a discarded draft. Composing a *new* meal
shows no delete (there is nothing to delete). This keeps the meal row single-purpose
(tap = edit) and makes accidental deletion hard, while the undo toast remains the real
safety net. (Swipe/long-press delete from the day page was prototyped and rejected:
the gesture is invisible and collides with scroll/tap-to-edit; "deleted by accident" is
judged worse than "one extra tap to find delete" — see the now-deleted prototype at
`docs/design/meal-delete-prototype.html` (verdict baked into this ADR; prototype removed
once the decision shipped, issue #268).)

**Undo semantics.** "Undo delete" is **not transactional rollback**. The page snapshots
the working meal into the `discardBuffer` *before* `remove` is called; the layout toast's
`Zpět` rehydrates that snapshot back into the `/meal` page. The user then taps the
**finalize CTA** to re-persist — and because the original record was removed, this
genuinely mints a fresh `Meal` with a new `createdAt`, identical to the deleted one for
all user-visible purposes (the `createdAt`-preservation rule applies to in-place edits,
not to a post-delete re-create). The same pattern fits "empty-meal hint": finalizing a
zero-food working list is a no-op (composing-new) or shows an inline hint pointing to
Smazat (editing-existing) — emptying-then-saving is never a hidden delete alias.

### Discard guard

The discard prompt appears **iff backing out would lose *unsaved work*** — not merely
iff the working list is non-empty. The earlier non-empty gate was wrong for edit mode:
opening a saved meal hydrates a non-empty working list *before the user touches anything*,
so a clean back-out falsely claimed a discard. The trigger is now **dirtiness**, computed
against a snapshot captured on load (working items **or** `mealNotes` differ):

| Mode | Back-out condition | Toast |
|---|---|---|
| Compose-new | working list non-empty | `Jídlo neuloženo` |
| Editing-existing | **dirty** (differs from the loaded meal) | `Změny neuloženy` |
| Editing-existing | clean (untouched) | — none — |
| Delete (any) | — (always) | `Jídlo smazáno` |

The mechanism is unchanged: **optimistic discard + undo**, not a blocking confirm. The
action proceeds immediately, the working list is buffered to the `discardBuffer` store,
and a layout `Toast` with `onUndo` (`… · Zpět`) restores it within the toast window. The
buffer carries a `kind` discriminator (`compose` / `edit` / `delete`) so the layout
picks the right of the three strings. Tying the prompt to the *consequence* (data loss),
not the *gesture*, keeps it from becoming a reflexively-dismissed dialog.

Wording note: the three strings are deliberately distinct. `neuloženo` / `neuloženy`
("not saved") fits a draft or edits that never reached Dexie; the delete path can't share
them ("not saved" is false — the meal *was* saved, then removed), so it reads
`Jídlo smazáno`, mirroring the `Smazat jídlo` button that triggered it. Czech agreement:
neuter-singular `Jídlo neuloženo`, feminine-plural `Změny neuloženy`.

## Reversed approach (recorded so the trail is legible)

ADR-0019 originally made meal type a mutable attribute with **MOVE** (relabel draft onto
an empty slot) and **SWITCH-AWAY** (load a filled slot, abandoning the draft). Both are
removed. The motivating case for MOVE — "the mother realizes mid-logging the foods are
lunch, not breakfast" — is now handled by backing out (undo-protected) and re-entering
via the FAB under the right type. Two different meals are two deliberate acts, not one
fluid relabel. SWITCH-AWAY's job (open another meal) moves to the day-page launcher,
where no draft is in flight to lose.

## Consequences

- **Net code subtraction.** The following are retired: `MealTypePills` (component +
  tests), the meal-type pills on `/meal`, MOVE / SWITCH-AWAY, `occupiedTypes`,
  `loadedFromType`, the `handlePill*` handlers, `parseMealType`'s `'lunch'` fallback, and
  the `+ Přidat` link on `MealCard`. Added: a FAB-with-submenu and tappable meal rows on
  the day page, and a ⋯-overflow "Smazat jídlo" in `/meal` edit mode. Shipped via
  issues #266 (fixed-type entry + FAB launcher), #267 (tap-to-edit from `MealCard`),
  and #268 (explicit Smazat + empty-meal guard).
- **The undo buffer survives navigation** for the back-out case: after `goto(returnTo)`
  the meal page unmounts, so the buffer is a store (not component state) and the restore
  toast is rendered at app/layout level. Delete reuses the *same* buffer + layout toast.
  No new dialog component is needed.
- **`MealCard` becomes view + tap-to-edit only** — its empty state ("Zatím žádná jídla")
  is a label, no longer an action. All meal entry (create *and* edit) flows through the
  FAB submenu or a tapped row.
- **Checking another meal mid-compose is out of scope** (PRD scenario "what did I have
  for breakfast?"). The mother retreats to the day page (a non-empty draft is
  undo-protected) or relies on memory; `/meal` shows only the one meal it composes.
- **Editing a finalized meal, then backing out, loses the *edits* but not the stored
  meal.** The guard fires only when the edits are **dirty** (a clean back-out is silent),
  and its toast reads `Změny neuloženy` — distinguishing "your unsaved edits were dropped"
  from "the meal was discarded." (Revised 2026-06-15; the original ADR fired on any
  non-empty list and reused the draft's wording.)
- **Swipe / native-back is de-scoped for v1.** v1 ships as a standalone iOS PWA
  ([ADR-0001](0001-single-device-v1.md)) with no native edge-swipe-back and no browser
  back button — on `/meal` the in-app back arrow is the only exit, so the guard lives in
  `handleBack`, not a navigation hook. Widening the platform assumption (Android system
  back, in-browser use) would route exits through `popstate`; the natural extension is a
  `beforeNavigate` guard that fires `writeBuffer` on a popstate leaving a non-empty
  grid — reusing the same buffer + layout undo toast, not a second discard path. Unbuilt
  for v1.

## Revision: label + discard accuracy (2026-06-15)

A post-ship polish pass refined two user-facing aspects without touching the commit-gate
decision itself. Both are folded into the sections above; summarised here for the trail:

1. **Finalize CTA `Hotovo` → `Uložit` (mode-aware).** `Hotovo` was the lone exception in
   an otherwise-uniform `Uložit {what}` CTA ladder, and — being silent about *saving* — it
   under-described the only action that writes to Dexie. The relabel unifies the ladder
   (`Uložit {Food}` / `Uložit {Family}` / `Uložit {MealType}`) and the edit-mode form
   `Uložit změny` makes *update* legible against *create*. The persist point also now
   preserves `createdAt` on an in-place edit (stamping `updatedAt`) instead of resetting
   it every save.
2. **Discard toast made dirty-aware.** The old non-empty gate fired on a clean edit-back
   (a hydrated meal is non-empty before any change), falsely showing a discard toast.
   Trigger is now *dirtiness vs the loaded snapshot*, with three distinct strings
   (`Jídlo neuloženo` / `Změny neuloženy` / `Jídlo smazáno`) keyed by a `kind`
   discriminator on the buffer.

Purely-visual changes from the same pass live in `DESIGN.md` / the components showcase,
not here: the `/meal` header gained a `large` `PageHeader` variant showing the meal-type
label; the `Smazat jídlo` confirm button moved `bg-danger → bg-primary` (red is reserved
for allergen/skin meaning, DESIGN.md); the FAB meal-type rows + `MealCard` markers moved
from emoji to monochrome SVG icons; and the confirmed food-row now renders the Czech
portion `label` plus a when-set `· {preparation}` suffix (matched in `MealCard`). Variants
were explored in the throwaway prototype `docs/design/meal-polish-variants.html` (verdict
baked in here; prototype to be removed once the changes ship, per the §3 precedent).
