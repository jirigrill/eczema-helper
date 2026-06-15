# 0018 — Meal logging lifecycle: commit-gate, fixed-type entry, explicit delete

**Status:** Proposed
**Date:** 2026-06-14
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

### 1. Commit-gate — only "Hotovo" persists

The working meal lives in memory until finalized. Drill-in confirmations and family
commits mutate only the in-memory working list; nothing is written to Dexie until
"Hotovo." A meal is therefore a deliberate, finished artifact — the day overview never
shows a half-built draft.

- **Persist point:** "Hotovo" writes the `Meal` to Dexie and navigates to `returnTo`.
  Success needs no toast — the destination day overview renders the saved meal
  immediately via live query, which is its own receipt. A *failed* write surfaces an
  error `Toast` and keeps the user on `/meal`, so a non-empty working meal is never
  silently lost to a persistence error.
- **Empty Hotovo is blocked.** Finalizing a zero-food working list does nothing
  (composing) or is rejected with a hint (editing — "a meal needs at least one food;
  use Smazat to remove it"). Deleting a meal is never done by emptying it.

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

### 3. Delete is explicit, edit-mode-only, undo-protected

A "Smazat jídlo" action appears **only when editing an existing meal**, behind the
header overflow (⋯) + a confirm sheet. It calls the repository `remove`, navigates to
`returnTo`, and offers the same undo toast as a discarded draft. Composing a *new* meal
shows no delete (there is nothing to delete). This keeps the meal row single-purpose
(tap = edit) and makes accidental deletion hard, while the undo toast remains the real
safety net. (Swipe/long-press delete from the day page was prototyped and rejected:
the gesture is invisible and collides with scroll/tap-to-edit; "deleted by accident" is
judged worse than "one extra tap to find delete" — see
`docs/design/meal-delete-prototype.html`.)

### Discard guard

The discard prompt appears **iff a non-empty, unfinalized working list would be lost** —
i.e. on back-out (the in-app back arrow) from a filled draft. The mechanism is
**optimistic discard + undo**, not a blocking confirm: the action proceeds immediately,
the working list is buffered to a store, and a `Toast` with `onUndo` ("Jídlo zahozeno ·
Zpět") restores it within the toast window. Tying the prompt to the *consequence* (data
loss), not the *gesture*, keeps it from becoming a reflexively-dismissed dialog.

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
  the day page, and a ⋯-overflow "Smazat jídlo" in `/meal` edit mode. The current code
  still implements the reversed model; this ADR describes the target and implies that
  cleanup as a follow-up.
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
  meal**; the guard still fires on the non-empty list. Accepted for v1.
- **Swipe / native-back is de-scoped for v1.** v1 ships as a standalone iOS PWA
  ([ADR-0001](0001-single-device-v1.md)) with no native edge-swipe-back and no browser
  back button — on `/meal` the in-app back arrow is the only exit, so the guard lives in
  `handleBack`, not a navigation hook. Widening the platform assumption (Android system
  back, in-browser use) would route exits through `popstate`; the natural extension is a
  `beforeNavigate` guard that fires `writeBuffer` on a popstate leaving a non-empty
  grid — reusing the same buffer + layout undo toast, not a second discard path. Unbuilt
  for v1.
