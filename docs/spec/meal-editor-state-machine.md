# Meal editor — behavior specification

**Status:** extracted specification, platform-neutral.
**Extracted from:** `main` @ `449019e`, 2026-08-13. Resolves research ticket
[#674](https://github.com/jirigrill/eczema-helper/issues/674); charted on the transition map
[#672](https://github.com/jirigrill/eczema-helper/issues/672).
**Corrected:** 2026-08-26 for [#690](https://github.com/jirigrill/eczema-helper/issues/690)
([#746](https://github.com/jirigrill/eczema-helper/issues/746)) — see _How to read this
document_ below.

## How to read this document

This document was written **before** the behavior-spec format existed, so — unlike every
section in `eczema-ios/docs/spec/` — it carries **no rule ids and no strength marks**. It is
therefore primarily a **description of the PWA**, not a set of instructions to the port. Where
the two differ, the difference is marked inline as a **Port rule** block. Read those as the
requirement and the surrounding prose as the reference implementation's behavior.

Six behaviors described here were **overturned** by
[#690](https://github.com/jirigrill/eczema-helper/issues/690), which established the governing
default: **the port picks the coherent rule, and _keeping_ a divergence is what needs a named
reason.** Each is corrected in place at §3.3, §3.4, §4.4, §6.1, §9.3 and §9.5. Nothing else in
this document has been adjudicated against that default — treat an unmarked wart as
_undecided_, not as endorsed.

## Overview

The meal editor is the screen on which one meal is composed or edited. It is the most
intricate piece of behavior in the product and — before this document — it existed only as
TypeScript plus roughly 1,600 lines of tests. This specification states what the editor
_does_, in English, without reference to Svelte, Dexie, IndexedDB, or the Czech user
interface, so that it can be re-implemented on another platform and verified against
tests derived from this text rather than from the original code.

Three separate state machines cooperate and are described separately below:

1. **Per-food state** — each individual food in the working meal is `idle`, `editing`,
   `confirmed`, or `locked`. This is the machine that enforces "one food editing at a time".
2. **Session state** — the editor as a whole is either _composing_ a new meal or _editing_
   a saved one, and is either _clean_ or _dirty_ relative to what was loaded.
3. **Exit state** — what happens when the user leaves: save, delete, discard-with-undo, or
   nothing. This machine spans the editor, the screen, and the application shell, and it is
   where the current implementation is least coherent (§9).

Terminology follows `UBIQUITOUS_LANGUAGE.md` (Working Meal, MealEditor, Active Edit Slot,
Commit-Gate, Discard Toast, Fixed-at-Entry). Domain rules that already have a home are
referenced, not restated: see `CONTEXT.md` § _Invariants_, cited here as **INV-n**. Those
ids are now **stable identity, not position** — assigned once, never reused, never
renumbered ([#689](https://github.com/jirigrill/eczema-helper/issues/689)) — and each is
individually anchored, so a citation links as
[`CONTEXT.md#inv-4`](https://github.com/jirigrill/eczema-helper/blob/main/CONTEXT.md#inv-4).

The invariants this specification depends on:

| Ref                                                                              | Bullet (leading phrase)                                  |
| -------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [INV-3](https://github.com/jirigrill/eczema-helper/blob/main/CONTEXT.md#inv-3)   | _Meals are day-granular._                                |
| [INV-4](https://github.com/jirigrill/eczema-helper/blob/main/CONTEXT.md#inv-4)   | _One `Meal` per date+mealType+actor slot._               |
| [INV-8](https://github.com/jirigrill/eczema-helper/blob/main/CONTEXT.md#inv-8)   | _`id` and `createdAt` immutable across delete-and-undo._ |
| [INV-11](https://github.com/jirigrill/eczema-helper/blob/main/CONTEXT.md#inv-11) | _The app is a Logging Tool._                             |
| [INV-12](https://github.com/jirigrill/eczema-helper/blob/main/CONTEXT.md#inv-12) | _Domain records carry types, not display strings._       |
| [INV-13](https://github.com/jirigrill/eczema-helper/blob/main/CONTEXT.md#inv-13) | _Food catalog is data-first and bundled._                |

Czech user-interface strings appear in this document **only as illustrations** of a rule
that is stated in English first. The Czech app is the reference implementation, not the
specification.

---

## 1. Vocabulary

| Term               | Meaning                                                                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Slot**           | The triple `(date, mealType, actor)`. INV-4: exactly one saved meal per slot.                                                                                  |
| **Working meal**   | The in-memory draft: a list of _families_, each holding a list of _working foods_, plus a free-text note. Never persisted directly.                            |
| **Working food**   | One catalog food inside the working meal: its id, its display name, its per-food state, and a cached amount/preparation.                                       |
| **Confirmed food** | A working food in the `confirmed` state. Only confirmed foods are persisted.                                                                                   |
| **Load snapshot**  | An order-independent, comparable projection of the working meal _as loaded_, used solely to decide dirtiness.                                                  |
| **Discard buffer** | A single-slot, in-memory, application-wide holder for one "undoable thing that just happened". At most one at a time; writing a new one destroys the previous. |
| **Session**        | One visit to the editor screen, from open to leave.                                                                                                            |

### 1.1 Fixed-at-entry

The meal type is bound when the screen is opened and can never change during the session.
The date is likewise fixed. Only the **actor** may change mid-session (§6). This is what
makes slot collisions impossible by construction: a draft and a saved meal can never
contend for the same slot.

Consequence for a port: the entry point must supply `mealType`, `date`, a `returnTo`
destination, and optionally an `actor`. A missing or unrecognised meal type is not
recoverable — the screen must refuse to open and return the user to the day view,
replacing rather than pushing history. A missing date defaults to today; a missing
`returnTo` defaults to the day view for the resolved date; a missing or unrecognised actor
defaults to `mother`, subject to correction by §5.

---

## 2. Per-food state machine

Every working food is in exactly one of four states.

| State       | Meaning                                                                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `idle`      | Present in the working structure but contributing nothing. Not persisted.                                                                                  |
| `editing`   | The one food whose amount/preparation the user is currently adjusting. Not persisted.                                                                      |
| `confirmed` | Part of the meal. Carries an amount and an optional preparation. **Persisted.**                                                                            |
| `locked`    | Temporarily frozen because _another_ food is `editing`. Carries a `prior` field recording what it was before it was locked — either `confirmed` or `idle`. |

A food additionally carries a **cache**: the amount and preparation from the last time it
was confirmed. The cache is not a state; it survives across state transitions and is what
makes re-selecting a previously-confirmed food restore its settings rather than start over.

### 2.1 Transitions

Each transition below is a pure function of `(working meal, familyId, foodId)` producing a
new working meal. All are scoped to **one family**: they only ever touch foods inside the
named family. This is a load-bearing detail, see §2.3.

**START-EDITING** — the user taps an `idle` food, or a `confirmed` food they want to
re-adjust.

- If the food is not yet present in the working structure, it is inserted as `idle` first
  (creating the family entry if needed). New foods are always **appended**; order is
  insertion order and is never re-sorted.
- The tapped food becomes `editing`, with amount = its cached amount if it has one,
  otherwise the **default portion size** (there is no "no amount yet" editing state — a food
  entering editing always carries a concrete amount), and preparation = its cached
  preparation (possibly none).
- Every _other_ food in the same family that is `idle`, `editing`, or `confirmed` becomes
  `locked`, recording `prior = 'confirmed'` if it was confirmed and `prior = 'idle'`
  otherwise. **A food that was already `editing` and is locked records `prior = 'idle'`,
  losing the fact it was mid-edit.** In practice this cannot happen, because at most one
  food is ever `editing`; it is specified here because the implementation encodes it.
- Foods already `locked` are left alone.

**CONFIRM** — the user accepts the food currently being edited.

- The named food, if `editing`, becomes `confirmed` with the amount and preparation it had
  while editing, and **its cache is updated to those values**.
- Every `locked` food in the family is released: back to `confirmed` (with its cached
  amount/preparation) if `prior = 'confirmed'` **and it has a cached amount**; otherwise
  to `idle`.
- If the named food is not `editing`, it is left untouched — but locked siblings are
  released anyway. Confirm is therefore also usable as a bare "release the lock" operation.

**CANCEL-EDITING** — the user taps the editing food again, or taps outside the editor.

- The named food, if `editing`, becomes `idle`. **Its cache is not updated** — an abandoned
  edit stores nothing.
- Locked siblings are released by exactly the rule in CONFIRM.

**DESELECT** — the user taps a `confirmed` food to remove it from the meal without opening
the editor.

- The food becomes `idle`. **The cache is preserved**, so re-selecting it later restores the
  amount and preparation it had.
- **No-op unless the food is `confirmed`.** Deselect will not cancel an in-progress edit.
- No other food is touched. (Note the asymmetry: deselect does not release locks. It is only
  reachable when nothing is locked.)

> **Cache asymmetry — the single most error-prone rule here.** Two verbs return a food to
> `idle`, with opposite cache semantics: CANCEL-EDITING (abandon an unconfirmed edit) stores
> nothing, so re-selecting starts from defaults; DESELECT (drop a confirmed food) keeps the
> cache, so re-selecting restores what it had. A port that treats them as one operation will
> get this wrong in one direction or the other.

**UPDATE-AMOUNT / UPDATE-PREPARATION** — adjust the food currently editing.

- No-ops unless the named food is `editing`. Amount is one of a fixed set of portion kinds;
  preparation is one of a fixed set of methods, or none.
- Which preparation options are _offered_ is a property of the catalog record for that food
  (INV-13). An authored empty list is an ordinary state — many foods (salt, oils, drinks)
  offer no preparation at all, and the editor then shows no preparation control. What is
  _offered_ is constrained; what is _stored_ on a saved meal item is not.

**REMOVE** — the user explicitly deletes a row from the working list.

- The food is removed from the family entirely, cache and all.
- **If the removed food was the one `editing`**, locked siblings in that family are released
  by the CONFIRM rule. If it was not editing, siblings are untouched.
- A food id that is not present is a **silent no-op**. (Contrast §3.2, where an unknown food
  id is a hard failure. The two are deliberately different: an absent id here is "nothing to
  remove"; an unknown id there is corrupt persisted data.)

**COMMIT-FAMILY** — the user finishes with a family and returns to the grid.

- Every food in that family that is neither `editing` nor `confirmed` is **dropped from the
  working structure**. This is a compaction, not a state change: `idle` and `locked` foods
  disappear, taking their caches with them.
- Foods that are `editing` or `confirmed` survive unchanged.

> **Divergence / naming defect.** The implementation's doc comment on COMMIT-FAMILY claims
> it _"reset[s] confirmed foods' caches so the slot is clean for a future edit"_. It does
> not; it only filters. Confirmed foods keep their caches. The comment is wrong; the code
> and its tests agree with each other. Port the code, not the comment.

### 2.2 Invariant: one food editing at a time ("Active Edit Slot")

At most one food is `editing` **per family** at any moment. The mechanism is the lock: any
transition into `editing` locks all siblings, and every transition out of `editing`
(confirm, cancel, remove) releases them.

Two important qualifications the vocabulary glosses over:

- The constraint is enforced **per family**, not per screen, because every transition
  function is family-scoped. The _screen_ extends it to a global constraint by construction
  (§4.3, §4.4), not the domain layer. A port that renders more than one family at once would
  lose the guarantee unless it re-imposes it.
- Locking also disables navigation into another family: while a food is being edited on the
  grid, tapping a family tile does nothing (§4.4).

### 2.3 Same food in two families

Not possible. Every food belongs to exactly one family in the catalog (INV-13), so a food
id determines its family. The screen nonetheless searches all families by food id when
looking up a grid row, because the grid presents a flattened list.

### 2.4 Read projections

- **Confirmed foods for a family** — the family's `confirmed` foods, in insertion order.
- **All confirmed foods** — every family's confirmed foods, families in insertion order,
  foods in insertion order within each.
- **Editing food for a family** — the single `editing` food, or none.
- **Non-empty** — true if _any_ food anywhere is `editing` or `confirmed`. Note this counts
  an in-progress edit as content; the _persistable_ test (§3.1) counts only `confirmed`.

---

## 3. Persistence boundary

### 3.1 Working meal → saved meal

Only `confirmed` foods become saved items. Each item carries a freshly minted id, the food's
display name, the food id, the amount, and the optional preparation. Attempting to project a
non-confirmed food is a programming error and must fail loudly rather than silently drop it.

The note is trimmed; an empty or whitespace-only note is stored as _absent_, not as an empty
string.

**Timestamp rule.** A compose-new write mints a fresh creation timestamp and carries no
update timestamp. An edit-update preserves the creation timestamp it loaded and stamps an
update timestamp. (This mirrors, for meals, the immutability principle INV-8 states for skin
observations.)

**Empty result.** If there are no confirmed foods, the projection yields _nothing_ rather
than an empty meal. What happens then is §7.2 — it depends on whether a meal was loaded.

### 3.2 Saved meal → working meal

Every persisted item is rehydrated as a `confirmed` food, with its cache pre-filled from the
persisted amount and preparation, placed into the family its food id belongs to. Families
appear in first-encounter order.

**A persisted item whose food id is not in the catalog is a hard failure.** The editor must
refuse to open the meal rather than silently drop the item. Rationale, carried over
verbatim in spirit: dropping the item would silently shrink a meal the user logged, which is
worse than failing to open it. A port must therefore treat "retire a catalog id" as a
migration-requiring change, not a rename.

### 3.3 Dirtiness

Dirtiness compares a **snapshot** of the live working meal against the **load snapshot**.

A snapshot is: the list of confirmed items reduced to `(name, foodId, amount, preparation)`,
plus the **trimmed** note. Note what is _absent_: the per-item identifier. Item ids are minted
afresh on every projection, so including them would make every meal read as dirty against
itself. The display name _is_ included, so renaming a food in the catalog would read as a
change — acceptable today because the catalog is immutable at runtime (INV-13).

**Absent preparation and explicitly-unset preparation must compare equal.** Toggling a
preparation on and then off again leaves the field explicitly empty, whereas a never-touched
food has no field at all; if these compared unequal, the editor would be permanently dirty
after any such toggle. Conversely, _unsetting_ a preparation that was previously set **is** a
change. A port whose comparison is structural (serialize-and-compare) will get this wrong.

Two snapshots are equal when the trimmed notes are identical, the item counts match, and the
multisets of item tuples match. Comparison is **order-independent** — editing reorders foods
and reordering is not a change. It is _not_ set-based: duplicate tuples are compared with
multiplicity (though duplicates cannot arise, since food ids are unique within a working
meal).

Consequences that a port must reproduce:

- Whitespace-only changes to the note never make the editor dirty.
- Adding a food and then removing it again returns the editor to clean.
- Changing an amount or preparation makes it dirty; changing it back makes it clean again.
- A food left in `editing` (never confirmed) does **not** contribute to the snapshot. In the
  PWA that means it does not make an _edit session_ dirty, while it does make a _compose_
  session non-empty (§3.4) — the asymmetry #690 overturned. It stays true that an unconfirmed
  food does not contribute to the **snapshot**; what changes is that the snapshot is no longer
  the only question asked.

> **Port rule — the snapshot answers one question, not two**
> ([#690](https://github.com/jirigrill/eczema-helper/issues/690) §2). The port asks **two
> separate questions with two separate answers**:
>
> - **Can this be saved?** — confirmed foods only. This is the snapshot comparison above,
>   unchanged.
> - **Would leaving here lose something the mother did?** — counts in-progress work too,
>   **identically in compose and edit**. This second predicate is named **pending work**
>   ([#707](https://github.com/jirigrill/eczema-helper/issues/707)).
>
> The correction is to **split** the predicate, not to merge the two cases. "Make an editing
> food dirty" is a trap: in an edit session the dirtiness test _also_ gates the save action,
> and saving drops unconfirmed foods anyway (the snapshot is confirmed-only), so it would
> offer a save that silently loses the very thing it claimed to be saving.

### 3.4 The two "is there anything here" tests

These are deliberately different and must not be merged:

| Test                 | Counts                       | Used for                                                                                                                                  |
| -------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| _Non-empty_          | `editing` **or** `confirmed` | Whether a compose session is dirty; whether a discard buffer is worth writing; whether a delete-undo should fall back to the loaded foods |
| _Has confirmed food_ | `confirmed` only             | Whether a compose session can be saved; whether the copy action is offered; whether the "done" exit applies                               |

So: a compose session with one food mid-edit and nothing confirmed **is dirty** (backing out
raises a discard toast) but **cannot be saved** (the save action is disabled).

> **Port rule — the table stands; one leg of it changes**
> ([#690](https://github.com/jirigrill/eczema-helper/issues/690) §2). The two tests really are
> distinct and are **not** merged — that holds for the **save** leg, which stays
> confirmed-only in both session modes. What fails is the **dirtiness** leg: _Non-empty_ is
> scoped to compose in the PWA, and in the port the "would leaving lose something she did"
> question (**pending work**) is asked **identically in compose and edit**. So the compose
> sentence above becomes the rule for both modes, and the save sentence is untouched.

---

## 4. Session state machine

### 4.1 Opening

Opening the editor against a slot has exactly two outcomes.

**Slot occupied → `edit` session.**

- Working meal rehydrated from the saved meal (§3.2), including its note.
- Mode = `edit`.
- Loaded creation timestamp = the saved meal's.
- Load snapshot = a snapshot of what was just loaded.
- A copy of the loaded working meal is retained separately (see §9.1).

**Slot empty → `compose` session.**

- Working meal empty, note empty, mode = `compose`.
- Loaded creation timestamp = none, load snapshot = none, retained loaded copy = none.

The presence or absence of the load snapshot is the actual discriminator for dirtiness:

- **No load snapshot** (compose): dirty ⟺ the working meal is non-empty (§3.4, first column).
- **Load snapshot present** (edit): dirty ⟺ the live snapshot differs from it.

### 4.2 Can-finalize

- **Compose:** finalize is available ⟺ there is at least one confirmed food.
- **Edit:** finalize is available ⟺ the session is dirty — _including_ when the user has
  emptied the meal, because emptying is now a legitimate way to delete it (§7.2). This
  reverses an earlier rule under which an emptied meal was a no-op.

### 4.3 View state

The screen has three mutually exclusive presentations. View state belongs to the screen, not
to the editor.

| View              | Description                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **Grid**          | The catalog of families, plus a working list of the meal's current foods, plus the note field. |
| **Drill-in**      | One family's foods, with an inline editor unfolding under whichever is `editing`.              |
| **Grid row edit** | The grid, with one working-list row expanded into the same inline editor.                      |

Drill-in and grid-row-edit are mutually exclusive in practice: entering a drill-in is blocked
while a grid row is open (§4.4).

Drill-in entry pushes a history entry carrying the family id, so that the platform's back
gesture pops out of the drill-in rather than leaving the screen. Leaving a drill-in — whether
by the back control or by committing the family — must pop that entry rather than push a new
one, so that the history stack does not grow with each visit. On a cold start the drill-in is
never restored; the screen opens on the grid (consistent with the working meal itself being
lost).

### 4.4 Screen-level interaction rules

- **Grid, tap a family tile:** enter drill-in for that family — _unless_ a grid row is
  currently open for editing, in which case the tap is ignored.
- **Drill-in, tap a food:** if it is `editing` → CANCEL-EDITING; if `confirmed` → DESELECT;
  if `locked` → ignore; otherwise → START-EDITING.
- **Drill-in, tap outside any food tile:** CANCEL-EDITING on whatever is editing.
- **Grid, tap a working-list row:** if that row is already the open one → CONFIRM it and
  close; otherwise → CONFIRM whatever row was open (if any), then START-EDITING the tapped
  one and mark it open. This is what makes "one food editing at a time" hold _across_
  families on the grid, since the two foods may live in different families.
- **Grid, tap outside any working-list row while one is open:** CONFIRM it and close.
- **Grid, remove a working-list row:** if that row was the open one, close it first, then
  REMOVE.
- **Working-list contents:** the grid's working list shows every food that is `confirmed`,
  `editing`, or `locked-with-prior-confirmed` — in family-then-insertion order. `idle` foods
  and `locked-with-prior-idle` foods are hidden. This is why opening a grid row editor does
  not visually drop the other rows: they are locked, but locked-from-confirmed, so they stay
  listed (greyed).
- **Summary line on a row:** the confirmed amount/preparation for a confirmed row; the
  _cached_ amount/preparation for a locked row; nothing at all for the row being edited (its
  editor is showing).
- **Family tiles on the grid never show per-food state.** Active/confirmed state is visible
  only inside the drill-in and in the working list.
- **Locked rendering distinguishes the two `prior` values:** a locked-from-confirmed sibling
  stays visible and filled; a locked-from-idle sibling is merely greyed. This is why the
  `prior` field must be modelled, not just a boolean lock.

> **Outside-click asymmetry — a genuine usability wart, overturned by
> [#690](https://github.com/jirigrill/eczema-helper/issues/690) §5.** In the PWA, tapping
> outside the editor **cancels** in the drill-in but **confirms** on the grid; the two views
> attach opposite meanings to the same gesture. Both behaviors are pinned by tests, so both
> were _intended_ — this is an override under the coherence default, not the correction of a
> mistake.
>
> **Port rule — confirm everywhere.** The drill-in's cancel-on-outside-tap goes; the grid's
> confirm becomes the single meaning of the gesture. Two reasons, both worth carrying:
> **destructive-by-default on an ambiguous gesture is the wrong side to err on**, especially
> one-handed with a baby in the other arm; and **on iOS it is not even the same primitive** —
> a tap outside a sheet or popover _dismisses_ it, so the drill-in's cancel would read as
> "dismiss the family", not "throw away the amount I just set". If cancelling matters, it
> earns a visible control, not the absence of one.
>
> This supersedes the drill-in bullet above ("**Drill-in, tap outside any food tile:**
> CANCEL-EDITING"), which describes the PWA.

---

## 5. Feeding stage → eligible actors

A meal is logged _for_ an actor. Which actors may be logged for is a pure function of the
single configured feeding stage:

| Feeding stage                                  | Eligible actors, in order |
| ---------------------------------------------- | ------------------------- |
| `breastfed` (exclusively breastfed, no solids) | `mother` only             |
| `mixed` (breastfed plus solids)                | `mother`, then `baby`     |
| `solids` (fully on solids)                     | `baby` only               |

The rationale, which a port should preserve because it drives the whole actor model: a
breastfed newborn's intake _is_ the mother's diet, so at the breastfed stage the mother is
the subject; once the child eats independently, the child is.

Rules derived from this:

1. **The actor picker is shown only when more than one actor is eligible** — i.e. only at the
   `mixed` stage. At a single-actor stage the actor is _implicit_ and no control is rendered.
2. The order of the list is the render order of the picker.
3. The first eligible actor is the **implicit actor** for the stage.
4. If the entry point supplied an actor that is not eligible at the live stage (e.g. a stale
   link carrying `mother` while the stage is `solids`), the screen **snaps to the implicit
   actor and re-opens on that slot**. This correction is _not_ a user-initiated swap: it does
   **not** autosave the departing actor, because the user never chose that actor and has no
   work there to preserve.
5. The picker is hidden while drilled into a family, so it does not compete with the drill-in
   chrome.

The feeding stage may resolve _after_ the screen mounts. Rule 4 must therefore be re-evaluated
when the stage becomes known, not only at mount.

---

## 6. Actor-swap autosave

Only reachable at the `mixed` stage, where both actors are eligible.

When the user taps the pill for a different actor:

1. If it is the actor already selected, nothing happens.
2. **The departing actor's session is finalized first** (§7). This is a full save with the
   ordinary semantics: confirmed foods plus note are persisted; a food left in `editing` is
   silently dropped; an empty compose session persists nothing; **an emptied existing meal is
   deleted** (§7.2).
   An unconfirmed food is dropped **silently**, with no warning and no undo. This is the one
   place the editor discards user input without telling them; it follows from the
   confirmed-only persistence rule (§3.1) and is pinned by test, so it is intended — but it is
   worth reproducing deliberately rather than by accident.
3. **If the save fails, the swap is aborted.** The departing actor stays selected, its working
   meal is preserved intact, and the failure is surfaced through the same error channel the
   save action uses. This is the single genuine data-loss path (storage quota exceeded, write
   rejected) and it must never be allowed to proceed silently.
4. On success, the editor re-opens on the target actor's slot — a fresh load from storage,
   which is authoritative. The selected actor flips only now.

**The swap is deliberately silent.** No discard toast, no undo entry, no confirmation. The
justification is that the autosave is _recoverable by swapping back_: the work was saved, not
discarded, so there is nothing to undo. The discard/undo machinery is intentionally not
reused here.

### 6.1 Autosaved-actor tracking

The screen records, per actor, whether _that_ actor's real work was autosaved by a swap during
this session. An actor is recorded when the user swaps **away** from it **while it had
something to finalize**. This drives the "done" exit in §8.3.

The tracking is deliberately per-actor rather than a session-wide flag: merely cycling between
two already-clean saved meals autosaves nothing, records nobody, and therefore leaves an
untouched actor showing the ordinary disabled save action. It is also never populated on
direct entry, so the ordinary clean-edit contract is untouched.

An actor drops out of the "done" presentation the instant it is edited again, because the
"done" condition also requires nothing left to finalize. This matters: without it, the
forward exit would navigate away over a dirty edit and silently drop the change — precisely
the loss the autosave exists to prevent.

**The tracking is screen-local and in-memory.** It does not survive a remount. A user who
reaches the "done" state, backs out, and undoes back into the editor arrives at a _fresh_
screen with an empty autosaved-actor set, and the action silently reverts to a disabled
save.

> **Port rule — the ephemerality is intended; the disabled action is the defect**
> ([#690](https://github.com/jirigrill/eczema-helper/issues/690) §6). "Done" **does not survive
> a remount, and that is correct.** It is a statement about _this visit_ — you swapped actor
> and it autosaved — not a property of the data, so recomputing it on mount would mean
> inventing a persisted "was autosaved" fact purely to keep a label alive.
>
> What is wrong is the **silently disabled action** the remount leaves behind, and that is a
> **presentation** problem: after a remount the screen shows the ordinary clean-edit state,
> which is _truthful_ but reads as "your work didn't take" — the very confusion the "done"
> state exists to prevent (§8.3). **No journal data is at risk either way**: the autosave
> already happened. This is the one of #690's six that is _specified_ rather than repaired —
> the behavior stays, the presentation of the post-remount state is the port's to solve.

---

## 7. Finalize

Finalize is the only operation that writes the meal (the **commit-gate**: nothing inside the
editor touches storage until finalize). Its result is one of three outcomes.

### 7.1 Saved

At least one confirmed food. The meal is upserted at its slot (INV-4 — the slot key is
deterministic, so this is an upsert, never an append), with the timestamp rule of §3.1.

### 7.2 Deleted

No confirmed foods **and** the session is an `edit`. The saved meal is removed. Emptying an
existing meal _is_ a delete, and behaves identically to the explicit delete action: same
removal, same toast, same undo.

### 7.3 No-op

No confirmed foods **and** the session is a `compose`. Nothing was ever persisted, so there is
nothing to remove.

### 7.4 Failure

Any storage failure propagates as a failure result and **must not** navigate away — leaving
the screen would evict the unsaved working meal. The error is surfaced on the screen and the
user stays put.

### 7.5 Preconditions

Finalizing without having opened a slot is a programming error and fails.

---

## 8. Call-to-action label chain

There is exactly one primary action button, and it always reads as _"save the smallest thing
currently in front of you"_. The label is a pure function of state, evaluated top-down; the
first matching rule wins.

| #   | Condition                                       | Label reads                             | Illustrative Czech      |
| --- | ----------------------------------------------- | --------------------------------------- | ----------------------- |
| 1   | Drilled into a family **and** a food is editing | save + **that food's name**             | `Uložit Mléko`          |
| 2   | Drilled into a family, nothing editing          | save + **that family's name**           | `Uložit Mléčné výrobky` |
| 3   | On the grid with a working-list row open        | save + **that food's name**             | `Uložit Mléko`          |
| 4   | "Done" state (§8.3)                             | a forward _done_ word, not a save word  | `Hotovo`                |
| 5   | `edit` session                                  | save + **"changes"**, not the meal type | `Uložit změny`          |
| 6   | `compose` session with ≥1 confirmed food        | save + **the meal type's name**         | `Uložit Oběd`           |
| 7   | otherwise (`compose`, nothing confirmed)        | the bare save word                      | `Uložit`                |

This is the **transition chain** the ticket names: as the user descends into a family and
opens a food, the label narrows from meal → family → food; as they back out, it widens again.
The rule to port is the _narrowing_, not the strings.

Rule 5 deserves its own note: an edit never names the meal type. Naming the change rather than
the meal is what keeps "update an existing record" legible as distinct from "create one".

### 8.1 Enabledness

The action is **disabled** when there is no drill-in, no open grid row, **and** the session
cannot finalize (§4.2). In other words: sub-actions (rows 1–3) are always enabled, because
there is always something to confirm; only the meal-level finalize can be dead.

The two disabled cases both read to the user as _"nothing to save right now"_:

- compose with zero confirmed foods, and
- a clean edit (the back control is the correct exit).

The "done" state (§8.3) is enabled despite the session not being able to finalize — it is a
navigation action, not a save.

### 8.2 What the action does

Mirrors the label, same precedence:

1. Drill-in with a food editing → CONFIRM that food. Stay in the drill-in.
2. Drill-in with nothing editing → COMMIT-FAMILY, leave the drill-in, pop the drill-in's
   history entry.
3. Grid row open → CONFIRM that row, close it.
4. Done state → navigate to `returnTo`. Nothing is written.
5. Disabled → do nothing.
6. Otherwise → finalize (§7), then navigate to `returnTo`.

### 8.3 The "done" state

A rescue for one specific confusing situation. All of the following must hold:

- the currently selected actor is one whose work was autosaved by a swap this session (§6.1),
- no drill-in and no open grid row,
- the session is an `edit`,
- nothing left to finalize (it is clean), **and**
- the meal actually has at least one confirmed food.

The problem it solves: after the user swaps to the other actor and swaps back, their work
_was_ saved, invisibly. Landing on a disabled _"save changes"_ button reads as _"your work
didn't take"_. So the action instead becomes a forward exit. A plain clean edit opened
directly from the day view keeps the established back-control-to-exit contract; a dirty edit
routes through the ordinary save; a genuinely empty meal falls through to the empty-meal hint
below.

### 8.4 Empty-meal hint

While editing a saved meal whose working list has been emptied — no drill-in, no open grid
row, no confirmed foods — an inline hint appears next to the action warning that saving now
**deletes** the meal. On a compose session the disabled action already communicates "nothing
to save", so no hint is shown there.

---

## 9. Exit paths, the discard guard, and undo

This is the least coherent area of the implementation and the one a port should redesign
rather than transliterate. The rules below state what the code does; §9.5 lists where the
duplication has produced actual divergence.

### 9.1 The discard descriptor

On leaving, the editor is asked what — if anything — should be recoverable. It answers with a
_descriptor_ or nothing. It never navigates and never decides _when_; the screen owns that.

Two inputs: the editor's own state, and an optional explicit `delete` intent (which the editor
could not infer, since deletion is a user action, not a state).

| Situation                        | Descriptor                                               |
| -------------------------------- | -------------------------------------------------------- |
| Explicit `delete` intent         | `meal-delete`, carrying the foods to restore (see below) |
| `edit`, clean                    | none                                                     |
| `edit`, dirty, still has content | `meal-edit`, carrying the live working meal              |
| `edit`, dirty, emptied           | `meal-delete`, carrying the _loaded_ foods               |
| `compose`, non-empty             | `meal-compose`, carrying the live working meal           |
| `compose`, empty                 | none                                                     |

Every descriptor carries the **live note text**, so an undo rehydrates whatever the user had
typed at the moment of discard.

The **delete payload rule** is subtle: undo of a delete must restore the _persisted_ foods,
not the live working list. When the user deletes explicitly, the foods are still present, so
the live list is correct. When the user _emptied_ the meal and then saved or backed out, the
live list is empty, so the payload falls back to the copy of the working meal retained at load
time (§4.1). Without this, undoing an emptied-meal delete would restore an empty meal.

The screen then pairs the descriptor with the slot identity — meal type, actor, date — and the
`returnTo` path, and writes it to the discard buffer. **Carrying the actor and the date is
load-bearing**: without the actor, an undo of a _baby_ edit would rebuild the return URL with
no actor, default to `mother`, and overwrite the mother's real meal with the restored baby
draft; without the date, an undo while browsing an earlier day would silently move the meal
forward to today.

### 9.2 Which exit path writes what

| Exit path                                                      | Behavior                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Save action** (§8.2 rule 6)                                  | Invalidate a stale copy-undo for this slot (§10.3). Capture the _delete_ descriptor **before** finalizing. Finalize. On failure: show the error, stay. On outcome `deleted`: write the captured delete descriptor to the buffer (finalize has already removed the row). On outcome `saved` or `noop`: write nothing. Navigate to `returnTo`. |
| **Back control, in a drill-in**                                | Leave the drill-in, pop its history entry. Never touches the buffer.                                                                                                                                                                                                                                                                         |
| **Back control, on the grid**                                  | Ask for a descriptor with no intent. If there is one, write it — and if it is a `meal-delete`, **also remove the row**, because a back-out never calls finalize. Navigate to `returnTo`.                                                                                                                                                     |
| **Platform back gesture / history pop that leaves the screen** | Same as the back control's grid branch, minus the navigation (the pop is already happening).                                                                                                                                                                                                                                                 |
| **Platform back gesture that only pops a drill-in**            | Restore the drill-in view state from history; do not touch the buffer.                                                                                                                                                                                                                                                                       |
| **Explicit delete action**                                     | Confirm sheet first. Invalidate a stale copy-undo. Capture the descriptor with explicit `delete` intent **before** removing. Remove. On failure: show the error, stay. On success: write the descriptor, navigate to `returnTo`.                                                                                                             |
| **Actor swap**                                                 | Finalizes, writes **nothing** to the buffer (§6).                                                                                                                                                                                                                                                                                            |
| **Copy**                                                       | Writes a `meal-copy` descriptor, which is a different animal entirely (§10).                                                                                                                                                                                                                                                                 |

The back-control path and the history-pop path must be arranged so that **exactly one of them
fires per navigation**. In the current implementation the back control navigates
programmatically and the history-pop handler ignores programmatic navigations for precisely
this reason; without that gate, backing out would write the buffer twice.

The drill-in's own back is invisible to the history-pop handler in the current implementation,
because it is a _shallow_ history entry. The explicit "am I in a drill-in?" check in the
history-pop handler is therefore dead defensive code today.

### 9.3 Undo

The buffer holds at most one descriptor. A toast offers undo; the wording is keyed by the
descriptor kind so that it stays truthful about what was lost:

| Kind           | The toast says, in effect                                    | Illustrative Czech |
| -------------- | ------------------------------------------------------------ | ------------------ |
| `meal-compose` | the draft meal was not saved                                 | `Jídlo neuloženo`  |
| `meal-edit`    | the _changes_ were not saved (the saved meal is still there) | `Změny neuloženy`  |
| `meal-delete`  | the meal was deleted                                         | `Jídlo smazáno`    |
| `meal-copy`    | the meal was copied                                          | —                  |

A clean back-out from an edit shows no toast at all.

**Dismissing the toast without undoing clears the buffer. Tapping undo does not** — the buffer
must survive the navigation, because the destination screen reads it on mount and clears it
there.

**Undo routing** — the shell decides, from the kind alone, where the undo lands:

- skin kinds → the skin screen for that observation;
- `meal-copy` → **reverse the copy first, then navigate** to the destination day; the buffer is
  cleared by the reversal path, not by the destination screen;
- all meal kinds → navigate to the meal editor for `(date, mealType, actor)` with the original
  `returnTo`.

**Undo rehydration** — on mount, the meal editor checks the buffer. If it holds a meal kind
_and it belongs to this screen_, it consumes it (clearing it) and overlays the editor state;
otherwise it opens normally from storage. The mount hydration runs **exactly once** per mount
and must be guarded against re-running when asynchronous state settles, otherwise a
just-restored dirty edit gets overwritten by a plain reload.

The overlay rule is per kind:

| Kind           | Effect on the restored session                                                                                                                                                                                                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `meal-edit`    | Mode = `edit`. **Re-read the persisted meal and take the load snapshot from _it_, not from the buffer.** The restored working meal therefore reads as **dirty** — the save action is enabled and a second back-out re-buffers rather than silently dropping the restored work. If the persisted meal has meanwhile vanished, fall back to no snapshot and no loaded timestamp. |
| `meal-delete`  | Mode = `compose`, no load snapshot, no loaded timestamp — the row is gone, so the next save mints a fresh record. **Corrected by [#690](https://github.com/jirigrill/eczema-helper/issues/690): the port carries the original creation timestamp through the undo and the re-save — see the Port rule below. The mode framing and the absent load snapshot are unchanged.**    |
| `meal-compose` | Mode = `compose`, same as above — the slot was empty to begin with.                                                                                                                                                                                                                                                                                                            |

Two consequences worth stating outright, because they surprise users and testers alike:

- **Undoing a delete does not re-persist the meal.** It restores the _draft_; the row is still
  gone from storage. The user must press the save action again — and because the session is
  now a compose, the action reads as _"save {meal type}"_, not _"save changes"_.
- **Undoing a dirty edit does re-persist nothing either**, but the row was never removed, so
  the meal is intact and only the edits are pending.

The `meal-edit` rule is the one that is easy to get wrong and easy to lose: taking the buffer's
own contents as the clean baseline would make the restored edit read as clean, disabling save
and silently dropping the restored food on the next back-out.

Note the consequence of the `meal-delete` rule **in the PWA**: an undone delete does not
restore the original creation timestamp. Because the undo re-frames the restored session as
**compose**, re-saving takes the compose branch and mints a fresh `createdAt` **with no
`updatedAt` at all** — so both timestamps lose their meaning, not one. This is the opposite of
the rule [INV-8](https://github.com/jirigrill/eczema-helper/blob/main/CONTEXT.md#inv-8) states
for skin observations, where `id` and `createdAt` are immutable across delete-and-undo (and
where the whole record genuinely is restored verbatim).

> **Port rule — meals align with skin**
> ([#690](https://github.com/jirigrill/eczema-helper/issues/690) §1). An undone meal delete
> **preserves the original creation timestamp**, and the re-save records **no update timestamp
> either** — nothing was updated, the record was restored. `createdAt` is the _witnessing
> moment_ for both entities
> ([INV-8](https://github.com/jirigrill/eczema-helper/blob/main/CONTEXT.md#inv-8)), and a
> meal's identity already survives an undo because the id _is_ the slot
> ([INV-4](https://github.com/jirigrill/eczema-helper/blob/main/CONTEXT.md#inv-4)) — so a meal
> is the same record after undo in every respect except this one field. Two rules for one
> concept is what a fresh spec should refuse to inherit; the asymmetry had no defender.
>
> This is **only** about the audit fields. Undo still restores a **draft**, not a row: the row
> really is gone from storage and the mother must still save. The overlay table's `meal-delete`
> row stays as written except that the loaded timestamp is now carried, not dropped.

### 9.4 Buffer lifetime

The buffer is in-memory and application-wide, holds one descriptor, and is destroyed by any
subsequent write. It does not survive a reload. The undo affordance is therefore best-effort
and short-lived by design.

### 9.5 Where the duplicated undo logic diverges

The single conceptual rule _"an undo returns the user to where the thing happened and restores
it"_ is implemented across four sites, with no shared abstraction:

1. **Shell / toast handler** — decides the destination from the kind; builds the meal URL from
   `(date, mealType, actor, returnTo)`; owns the copy-reversal branch; deliberately does _not_
   clear the buffer for the rehydrate kinds.
2. **Meal screen mount** — decides whether the buffer is _for this screen_, clears it, and
   delegates the overlay.
3. **Meal editor overlay** — decides the edit-vs-compose framing from the kind and re-reads the
   baseline.
4. **Skin screen mount** — its own independent copy of (2)+(3) for the skin kinds.

Divergences worth recording, all of them real in `449019e`. **Two of them are no longer merely
recorded**: buffer ownership and the failed-delete ordering were promoted to decided port rules
by [#690](https://github.com/jirigrill/eczema-helper/issues/690) (§3 and §4), marked inline
below.

- **The meal screen's ownership test is weaker than the URL the shell builds.** The shell
  routes the undo using date, meal type **and** actor. The mount check accepts the buffer if
  it is a meal kind and **the meal type matches** — it never compares date or actor. In the
  normal flow this is harmless, because the shell built the URL from the buffer, so they agree
  by construction. But it means _any_ other route into the editor that happens to match on
  meal type while a stale meal buffer exists will consume that buffer and overlay a foreign
  slot's contents.

  > **Port rule — buffer ownership is the full slot key**
  > ([#690](https://github.com/jirigrill/eczema-helper/issues/690) §3). **A buffered undo
  > belongs to a screen only if date, meal type _and_ actor all match the slot being opened.**
  > Matching the whole key is strictly _less_ code than matching part of it, and the slot key
  > already exists as a concept
  > ([INV-4](https://github.com/jirigrill/eczema-helper/blob/main/CONTEXT.md#inv-4)). This is
  > no longer a recommendation: it is the rule.

- **Clearing responsibility is split by kind.** For `meal-copy` the shell clears the buffer; for
  every other kind the destination screen clears it; for a dismissed-without-undo toast the
  shell clears it. Three owners for one lifetime.
- **The screen writes the buffer through one helper but removes the row in two different
  places.** `finalize` removes the row on the empty-edit path; the back-out path removes it
  itself, fire-and-forget, because a back-out never calls finalize. The delete action removes it
  a third way. The three are consistent today but there is no single "delete the meal" seam.
- **The `meal-delete` payload rule lives in the editor while the "also remove the row" rule
  lives in the screen**, so the two halves of "emptying a meal deletes it" cannot be read in one
  place.
- **A failed delete still destroys a pre-existing copy-undo.** The delete path invalidates a
  stale copy buffer for the slot _before_ attempting the removal. If the removal then fails,
  the user is left with no delete (correct) and also no copy-undo (not intended) — a no-op
  action consumed someone else's undo affordance.

  > **Port rule — nothing invalidates an undo until the write it supersedes has landed**
  > ([#690](https://github.com/jirigrill/eczema-helper/issues/690) §4). Stated as a general
  > rule rather than an ordering fix because **it applies to two paths, not one**. The delete
  > path is the one described above. The **save** path has the same shape: it invalidates the
  > copy buffer before calling finalize, and a failed finalize returns with the buffer already
  > cleared. Same loss, same fix — invalidate only after the destructive write succeeds. §9.2's
  > "Invalidate a stale copy-undo" steps on both the **Save action** and **Explicit delete
  > action** rows therefore move _after_ the write in the port.

- **A live copy buffer is half-visible to the editor.** The editor's mount hydration accepts
  only the three rehydratable meal kinds, so a `meal-copy` buffer is correctly ignored there —
  but it stays live for the shell's toast. Opening the editor while a copy toast is pending
  therefore leaves an undo offered for a slot the user may now be editing by hand. The
  staleness invalidation (§10.3) covers the case where they _save_; it does not cover the case
  where they merely look.
- The history-pop handler contains a drill-in guard that cannot currently fire (§9.2), and a
  long comment describing a `cancel()` + re-navigate design that was deliberately not built.
- **The buffer write on back-out is timing-sensitive.** Committing a family pops a history
  entry; issuing another history navigation before that settles makes the pop handler observe
  a stale drill-in flag and skip writing the buffer entirely — a silent loss of the discard
  toast. The end-to-end tests work around this with an explicit wait. A port that models the
  drill-in as view state rather than as a history entry avoids the hazard outright.

> **Port rule — collapse the four sites into one undoable action**
> ([#690](https://github.com/jirigrill/eczema-helper/issues/690) §3). Recorded here originally
> as a recommendation; it is now decided. Collapse (1)–(4) into a single _undoable action_
> abstraction — each undoable action knows its own reversal and its own landing place — and
> make buffer ownership a single explicit match on the full slot key.
>
> The collapse is not cosmetic: **the duplication is what let the two ownership rules drift
> apart**, so fixing the ownership test without collapsing the sites would leave the mechanism
> that produced the bug in place. Note site (4), skin's own check, is already id-based — it
> does not share the ownership defect, but it does share the duplication.

---

## 10. Copy meal

An action on an existing meal that duplicates its foods into another slot.

### 10.1 Availability and picking

- Offered only when the session is an `edit` **and** the meal has at least one confirmed food.
  A note-only meal has nothing to copy.
- Reached through an overflow menu on the header, which itself is shown only in an `edit`
  session and only on the grid (not in a drill-in).
- Picking a destination is two steps: a day strip, defaulting to the source day, then a meal-slot
  sheet defaulting to the source meal type.
- **Every day the strip renders is a legal destination**, including days in the future. There is
  no loggable-window gate. The strip spans `[min(today − 7d, earliest logged day, selected day)
… max(today + 7d, selected day)]`.
- **The actor is fixed to the source meal's actor** and is not selectable. The other actor's meal
  in the same visual cell is irrelevant and untouched.

### 10.2 The copy itself

Pure rule, given a source meal, whatever currently occupies the destination slot, and the
destination slot:

- **Destination empty →** compose-new: a meal at the destination slot key carrying every source
  item with freshly minted item ids, **no note**, a fresh creation timestamp, no update
  timestamp.
- **Destination occupied →** additive merge keyed by food id: only foods the destination _lacks_
  are added, with fresh item ids. **The destination always wins on collision** — amounts and
  preparations of foods already present are never overwritten. The destination's creation
  timestamp and note are preserved; an update timestamp is stamped.
- **Nothing to add →** a no-op: no write, no navigation, no toast. This covers copying a meal onto
  its own slot and copying onto a destination that already contains every source food.

> **Read the "destination wins" rule carefully.** When _every_ source food already exists at
> the destination, the result is the **no-op** — not an unchanged destination meal. A caller
> must treat "no meal produced" as "nothing to write", never as an error and never as a
> winner-take-all merge result. Differing amount or preparation does **not** make a food
> distinct: deduplication is by food id alone, and the destination's amount/preparation are
> never overwritten.

**The source note never travels**, in either branch. This is deliberate: a note is about a
particular eating occasion.

The merge is _silent_ — the destination picker gives no occupancy cues and every target reads
identically.

### 10.3 Copy undo

A copy's undo is a **reversal of the write**, not a rehydrate of a draft. Its descriptor
therefore carries no working meal; it carries the destination slot, the ids of the items the copy
added, whether the destination pre-existed, and the destination's update timestamp from before
the merge.

- destination did **not** pre-exist → the copy created the slot, so undo removes the meal
  entirely;
- destination **did** pre-exist → undo removes **only the items it added**, by id, and restores
  the prior update timestamp (unsetting it when it was previously unset). Prior foods and the
  prior note are untouched. If the destination has meanwhile vanished, the reversal succeeds
  vacuously.

**Sequencing.** On success the screen navigates to the destination day _first_ and writes the
undo descriptor _after_ the navigation settles, so the toast renders on the destination day
rather than on the editor being left behind.

**Staleness invalidation.** A copy's undo buffer must be discarded the moment its destination
slot is edited by hand — otherwise a later undo could remove or delete food the user added
manually after the copy. So: any manual save or delete of a slot clears the buffer if it holds
a `meal-copy` descriptor whose destination is _that exact slot_ (date, meal type and actor all
matching). Any other buffer kind, or a copy targeting a different slot, is left alone.

**Failure.** A failed destination write shows an error, dismisses the slot sheet so the message
is readable, stays on the picker, writes no buffer, and navigates nowhere.

---

## 11. Where each rule is currently verified

For a port that wants to translate the existing tests rather than write new ones. Paths are as
of `449019e`.

| Section                                                                | Current verification                                                                                            |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| §2 per-food transitions, §3.1–§3.2 projections, §10.2 copy rule        | `src/lib/domain/working-meal.test.ts` — pure, translates directly                                               |
| §3.3 dirtiness comparison                                              | `src/lib/domain/meal-dirtiness.test.ts` — pure, translates directly                                             |
| §4 session state, §6 swap, §7 finalize, §9.1 descriptors, §9.3 overlay | `src/lib/stores/meal-editor.test.ts` — runs against the real storage adapter; translates with a storage double  |
| §4.4 interaction rules, §8 label chain, §9.2 exit paths, §10.1 picker  | `tests/e2e/meal-*.test.ts` — end-to-end, Czech-label driven; **do not translate**, re-derive from this document |
| §5 eligible actors                                                     | `src/lib/domain/models.test.ts` — three assertions, trivially portable                                          |
| §8.3 done state, §9.2 buffer kinds, §10 copy flow                      | `src/routes/meal/page.test.ts` — component-level, Czech-label driven; do not translate                          |

Coverage gaps found while writing this document, i.e. rules stated here that **nothing**
currently verifies: the copy-undo reversal contract (§10.3) beyond its happy path; the
interaction between the "done" state and the discard buffer (§8.3); buffer ownership when the
buffer's slot does not match the opened slot (§9.5); and whether an unconfirmed food should
dirty an edit session (§3.4). The last two are now **decided** by
[#690](https://github.com/jirigrill/eczema-helper/issues/690) — so they are no longer open
questions, but they remain unverified in the PWA and the port must write the tests rather than
translate them.

---

## 12. Open questions and defects found

Recorded rather than guessed. Each is a candidate map ticket.

**Seven of the sixteen are closed** — struck through below, with the ticket that answered them.
Six were resolved by [#690](https://github.com/jirigrill/eczema-helper/issues/690) (questions 2,
3, 9, 10, 11, 12) and one by [#689](https://github.com/jirigrill/eczema-helper/issues/689)
(question 1). **The nine that remain are governed by #690's coherence default** — the port picks
the coherent rule and _keeping_ a divergence needs a named reason — but none has been
individually adjudicated. They do not each need a grilling ticket; they need that default
applied, and a reason recorded only where the wart survives it.

1. ~~**`CONTEXT.md` invariants are not numbered.** The handoff and the ticket both ask for
   reference "by number", but the `## Invariants` section is an unnumbered bullet list. This
   document cites them by file-order ordinal (INV-1 … INV-13), which will silently break the
   moment a bullet is inserted.~~ **Closed as resolved by
   [#689](https://github.com/jirigrill/eczema-helper/issues/689):** the invariants carry stable,
   individually anchored `INV-1..14` ids. **The hazard never fired** — all ten citations in this
   document (INV-3, 4, 8, 11, 12, 13) still resolve to the invariant intended, because `INV-14`
   was _appended_, not inserted. So this closes as resolved, not as repaired; the citations are
   now `CONTEXT.md#inv-n` anchor links as they stand.

2. ~~**Undone deletes: meals and skin observations follow opposite rules.** INV-8 makes an
   observation's `id` and `createdAt` immutable across delete-and-undo, on the grounds that
   `createdAt` records the _witnessing moment_. For meals, an undone delete re-frames the session
   as compose-new and mints a **fresh** creation timestamp. A meal's `id` is a deterministic slot
   key so identity survives, but the creation timestamp does not. Is that intended asymmetry, or
   an oversight? A port must pick one.~~ **Answered by
   [#690](https://github.com/jirigrill/eczema-helper/issues/690) §1: meals align with skin** —
   the port preserves the original `createdAt` and stamps no `updatedAt`. See §9.3's Port rule.

3. ~~**Buffer ownership is tested on meal type alone** (§9.5, first bullet). Should the rule be the
   full slot key? The tests do not exercise the mismatching case, so this is currently unspecified
   behavior rather than a known-good design.~~ **Answered by
   [#690](https://github.com/jirigrill/eczema-helper/issues/690) §3: yes, the full slot key** —
   date, meal type _and_ actor — and the four duplicated undo sites collapse into a single
   undoable action. See §9.5's two Port rules.

4. **The `commitFamily` doc comment contradicts its code** (§2.1). Harmless today because nothing
   depends on the cache being reset — but a port that trusts the comment would behave differently
   on re-entering a family.

5. **`startEditing` locking an already-`editing` sibling records `prior = 'idle'`**, losing the
   edit. Unreachable given the one-editing-at-a-time invariant, but it is an encoded behavior with
   no test pinning it. A port should either make it unrepresentable or assert it.

6. **`deselectFood` does not release locks** while every other exit from `editing` does (§2.1).
   Reachable only when nothing is locked, so it is currently sound, but the asymmetry is
   undocumented and would become a bug if the lock scope changed.

7. **The route comment about future days in the copy picker is easy to misread as contradicted
   by its test.** The comment says future cells are legal destinations; the test is named
   _"no future day is rendered"_. Both are true: the strip's future edge is fixed at today + 7d
   and the test probes today + 14d. The test name overstates. Worth renaming, and worth stating
   explicitly in any port that the future edge is a _fixed_ 7 days and is not extended by
   future-dated entries.

8. **There is no single "delete this meal" seam** (§9.5). Three call sites remove the row.

9. ~~**Whether an in-`editing` food should count as dirty in an `edit` session.** It does not
   (§3.3) — so a user who opens a saved meal, taps a new food, adjusts its amount, and backs out
   without confirming loses that food **with no discard toast**, because the edit session reads
   as clean. In a `compose` session the same sequence _does_ raise a toast (non-empty). This
   asymmetry looks unintentional and is not covered by any test found. Flagged as a probable
   defect rather than a rule.~~ **Answered by
   [#690](https://github.com/jirigrill/eczema-helper/issues/690) §2 by splitting the predicate**
   — "can this be saved" stays confirmed-only, while "would leaving lose something she did"
   (**pending work**) counts in-progress work identically in compose and edit. Note two
   corrections to the framing above: compose does not _warn_ — there is no confirm dialog
   anywhere, it silently buffers and offers an undo toast **after the fact** — and the edit case
   is **untested, not merely uncovered** (the compose case _is_ pinned), which is why "probable
   defect" was the right call. See §3.3 and §3.4. The related asymmetry that makes the actor
   swap silently drop an unconfirmed food (§6, step 2) _is_ pinned by a test and is untouched by
   this resolution.

10. ~~**The outside-click asymmetry** (§4.4): cancel in the drill-in, confirm on the grid. Both
    are pinned by tests, so both are intended, but nothing records _why_ they differ. A port
    must decide whether to reproduce it.~~ **Answered by
    [#690](https://github.com/jirigrill/eczema-helper/issues/690) §5: confirm everywhere** — the
    drill-in's cancel goes. See §4.4's Port rule for the two reasons.

11. ~~**The "done" state does not survive a remount** (§6.1). Reaching it, backing out, and
    undoing back into the editor silently returns a disabled save action, because the
    autosaved-actor set is screen-local. Is the done state supposed to be recoverable?~~
    **Answered by [#690](https://github.com/jirigrill/eczema-helper/issues/690) §6: the
    ephemerality is intended and specified as such; the silently disabled action it leaves behind
    is the defect, and it is a presentation problem.** See §6.1's Port rule. The coverage gap
    stands — nothing tests the interaction between the done state and the discard buffer.

12. ~~**A failed delete consumes a pre-existing copy-undo** (§9.5). Almost certainly an ordering
    bug rather than a rule.~~ **Answered by
    [#690](https://github.com/jirigrill/eczema-helper/issues/690) §4 as a general rule, not an
    ordering patch: nothing invalidates an undo until the write it supersedes has landed** — and
    it applies to the **save** path as well as the delete path. See §9.5's Port rule.

13. **Copy-meal's undo contract is almost entirely untested.** Only the happy path is covered
    end-to-end. The merge-versus-create branch, added-items-only removal, prior-update-timestamp
    restoration, staleness invalidation, self-copy no-op, and copy-save failure all rest on
    implementation reading alone. A port should treat §10.2–§10.3 as the specification and write
    tests against _it_, since none exist to port.

14. **Two disabledness conventions coexist.** The main action communicates disabled state
    through an accessibility attribute while the copy picker's confirm uses a real disabled
    control. Cosmetic in the current app; worth unifying in a port.

15. **Vocabulary split in the source.** Discard-descriptor kinds are domain-prefixed
    (`meal-compose`, `meal-edit`, `meal-delete`) while the session-mode value is not
    (`compose`, `edit`). Two names for the same distinction in the same object. `UBIQUITOUS_LANGUAGE.md`
    should own one of them.

16. **Several source comments contradict the code they document** — the family-commit comment
    (§2.1, item 4 above), a test comment claiming the item projection throws on an unconfirmed
    food (it returns an empty list; the throw belongs to rehydration), and a test comment
    misattributing a re-confirm step to projection rather than to dirtying. Harmless individually,
    but a port built by reading the comments rather than the assertions will diverge.
