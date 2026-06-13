# 0018 — Meal logging is commit-gated; discard uses optimistic undo

**Status:** Proposed
**Date:** 2026-06-12
**Related:** [ADR-0006](0006-dexie-persistence.md) · [ADR-0003](0003-day-granular-meals.md) · PRD: [issue #242](https://github.com/jirigrill/eczema-helper/issues/242)

## Context

The refactored `/meal` flow (PRD) builds a **working meal** in memory: foods are
confirmed in a family drill-in and accumulate in a working list before anything is
written. We had to decide *when* that working list becomes a persisted `Meal`.

Today's screen continuously autosaves — switching the meal-type pill writes the
previous slot to Dexie, and only the final CTA was a deliberate "done." That model
leaves half-built meals in the day overview and gives "done" no real meaning. The
alternative is a **commit-gate**: the working meal is not a real meal until the
mother explicitly finalizes it.

A commit-gate inverts the risk: instead of "everything is saved, done is
cosmetic," we get "nothing is saved until done, and leaving destroys the draft."
That makes accidental data loss (a reflexive back-swipe by a one-handed,
sleep-deprived parent) the thing to guard against.

## Decision

**Only "Hotovo" persists. The working meal lives in memory until finalized; any
exit that would lose a non-empty working list is guarded by optimistic
discard + undo.**

- **Persist point:** "Hotovo" writes the `Meal` to Dexie and navigates to
  `returnTo`. Success needs no confirmation toast — the destination day overview
  renders the saved meal immediately via live query, which is its own receipt.
  A *failed* write is surfaced with an error `Toast` and keeps the user on
  `/meal`, so a non-empty working meal is never silently lost to a persistence
  error. Drill-in confirmations and family commits mutate only the in-memory
  working list. A meal is therefore a deliberate, finished artifact — the day
  overview never shows a half-built draft.
- **Discard guard invariant:** the discard prompt appears **iff a non-empty,
  unfinalized working list would be lost** — i.e. on grid back/swipe and on
  switch-away onto a filled meal-type pill ([ADR-0019](0019-meal-type-mutable-with-move-semantics.md)).
  It does **not** fire for an empty working list or for a MOVE (which relabels and
  preserves the foods). Tying the prompt to the *consequence* (data loss), not the
  *gesture*, keeps it from becoming a reflexively-dismissed dialog.
- **Mechanism = optimistic discard + undo, not a blocking confirm.** The action
  proceeds immediately; the working list is buffered; a `Toast` with `onUndo`
  ("Jídlo zahozeno · Zpět") restores it within the toast window. "Leave instantly,
  undo if wrong" is less mid-gesture friction than a modal demanding a decision.

## Consequences

- The undo buffer must **survive navigation**: after `goto(returnTo)` the meal page
  unmounts, so the buffer is a store (not component state) and the restore toast is
  rendered at app/layout level for the back-out case. The switch-away case stays on
  `/meal` and is cheaper.
- No new dialog component is needed — `Toast.onUndo` already exists. A blocking
  `ConfirmDialog` was rejected as more state-for-state's-sake given the undo
  primitive is already present.
- The meal-type pill's old autosave-on-switch behaviour is removed; persistence
  is no longer coupled to slot switching ([ADR-0019](0019-meal-type-mutable-with-move-semantics.md)).
- Editing a previously-finalized meal that was loaded into the working list, then
  backing out, loses the *edits* but not the stored meal; the guard still fires on
  the non-empty list. Accepted for v1.
