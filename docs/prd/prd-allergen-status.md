## Problem Statement

As the mother running the elimination protocol, I look at the program timeline and the daily "what can I eat" view, and they disagree on which allergens I have already cleared. The program screen shows an allergen as "reintroduced" while the day view is still eliminating it. I cannot tell which view to trust, and on a day where I am cooking, that ambiguity costs me time and confidence.

The codebase has two definitions of "which allergens have already passed reintroduction":

- The daily elimination logic (`getEliminatedSlugsForDate` in `src/lib/domain/schedule-queries.ts`) says: an allergen has passed only if its reintroduction phase is **not** immediately followed by a rest phase. A rest phase signals a reaction, so the allergen stays eliminated until re-tested. This matches `CONTEXT.md → EliminationWindow`.
- The program timeline (`getAllergenStatusRows` inside `src/routes/program/+page.svelte`) says: every prior reintroduction counts as "already reintroduced," regardless of whether a rest followed.

Two definitions, two answers, no shared concept name. The next consumer that needs to ask "what is this allergen's status today?" (the v1.1 Insight engine, settings status, future end-of-protocol summary) will invent a third.

Grilling the problem also surfaced two adjacent gaps masked by the original aggregation:

- `permanentEliminations: string[]` on `GeneratedSchedule` collapses `motherAllergies` and `babyConfirmedAllergies` into one flat array. Mother's allergies are lifelong and never retested; baby's confirmed allergies are eliminated by default but eligible for end-of-program retest via `appendReTestPhases`. The aggregation throws away origin, which is load-bearing for the retest UI and for any future "did baby outgrow this?" question.
- The `'training'` phase type and its derived `TrainingReminder` name the *method* (small repeated doses), not the *goal* (building tolerance to a confirmed baby allergy). The Czech UI copy already describes it as "budování tolerance"; the domain literal lags the intent and reads as gym jargon in a paediatric context.

## Solution

Introduce **`AllergenStatus`** as a first-class derived concept in the domain layer. One pure query — `getAllergenStatuses(schedule, date)` — returns the per-allergen status for every relevant allergen on a given date. Every view (program timeline, today's elimination set, future Insight cards, settings status card) reads from this single source of truth.

The user-visible effect: the program timeline and the day view stop disagreeing. An allergen whose reintroduction was followed by a rest phase is shown as **reacted** on the program screen and remains in the day view's eliminated list — consistent with the `EliminationWindow` invariant.

The same query covers the broader lifecycle: it distinguishes mother allergies from confirmed baby allergies, surfaces the latest verdict for allergens that were retested, and gives the post-protocol UI a typed handle on the question "is this baby allergy still confirmed, or did the baby outgrow it?"

See [ADR-0012](../adr/0012-allergen-status-lifecycle.md) for the architectural rationale and full invariant list.

## User Stories

1. As a mother running the protocol, I want the program timeline and the day view to agree on which allergens I have cleared, so that I can trust either screen when I am cooking.
2. As a mother who reacted to dairy during its reintroduction phase, I want dairy shown as **reacted** on the program timeline (not "reintroduced"), so that I do not eat it by mistake.
3. As a mother who reacted to dairy, I want dairy still listed in today's eliminated allergens, so that the day view matches the program view.
4. As a mother whose reintroduction phase finished cleanly, I want that allergen shown as **passed** on the program timeline and removed from today's eliminated list, so that I know I can eat it.
5. As a mother currently in a reintroduction of eggs, I want eggs shown as **testing** on the program timeline, so that I know which allergen is on trial.
6. As a mother building tolerance to nuts in small doses, I want nuts shown as **budování tolerance** rather than **vyřazena** or **otestována**, so that the small-dose-allowed semantics are visible.
7. As a mother with a confirmed lifelong allergy of her own to soy, I want soy shown as a mother allergy on every view and never offered for retest, so that I do not confuse it with a baby allergy.
8. As a mother whose baby is confirmed allergic to dairy, I want dairy shown distinctly from her own allergies and offered as eligible for end-of-program retest, so that I can act on the medical advice that babies often outgrow allergies.
9. As a mother who appended a retest for dairy and got a clean result, I want dairy shown as **passed** afterwards — with a small badge indicating it was originally a baby allergy — so that I know the baby outgrew it.
10. As a mother whose baby's dairy retest came back reacted, I want dairy reverted to a confirmed baby allergy (not stuck on `reacted`), so that the day view keeps eliminating it as it did before the retest.
11. As a mother in week one of the elimination phase, I want every protocol allergen shown as **eliminated** with consistent labelling everywhere, so that the early phase is easy to understand.
12. As a mother looking ahead at a future reintroduction that has not started yet, I want those allergens shown as **not-yet-tested**, so that I can mentally pace the protocol.
13. As a mother who already appended a retest for dairy and reconsidered the date, I want a clear typed error if I try to append it again — not a silent duplicate phase — so that the timeline does not become ambiguous.
14. As a future maintainer adding the Insight engine (ADR-0007 v1.1), I want a single function that gives per-allergen status, so that I do not re-implement "has this allergen been cleared?" a third time.
15. As a developer adding a settings status card, I want to ask "how many allergens have I cleared?" with one call, so that the count cannot drift from the program view.
16. As an agent navigating this codebase, I want `AllergenStatus` to be a named concept in `CONTEXT.md` and the `UBIQUITOUS_LANGUAGE.md` index, so that I do not have to read both the route and the query file to understand "passed."

## Implementation Decisions

### New deep module: `getAllergenStatuses`

A pure query lives in a new file `src/lib/domain/allergen-status.ts` — distinct from `schedule-queries.ts` because `AllergenStatus` is the conceptual centrepiece of this work (one ADR, one named domain concept) and deserves its own file by prominence rather than by line count.

Signature:

```ts
function getAllergenStatuses(
  schedule: GeneratedSchedule,
  date: string,
): AllergenStatus[];
```

It returns one entry per allergen in the **closed universe** `permanentMother ∪ permanentBaby ∪ protocolMembers`. The three sets are disjoint by construction (the schedule generator already excludes permanent eliminations from the protocol allergen list).

Status shape (discriminated by `status`):

```ts
type AllergenStatus = {
  id: string; // category id (e.g. 'dairy', 'eggs:cooked')
  origin: 'mother' | 'baby' | 'protocol'; // identity, immutable
  status:
    | 'permanent-mother'   // mother's lifelong allergy; never enters reintro
    | 'permanent-baby'     // baby's confirmed allergy; eligible for retest
    | 'not-yet-tested'     // protocol allergen, reintro still in future (or never scheduled)
    | 'eliminated'         // currently inside elimination (or reset) phase
    | 'testing'            // currently inside a reintroduction phase
    | 'passed'             // latest reintro completed cleanly (no rest follow-up)
    | 'reacted'            // latest reintro was followed by a rest phase
    | 'tolerance-building' // open-ended tolerance-building phase active
};
```

The `origin` field carries identity (mother / baby-confirmed / protocol) independently of `status`. A baby-allergy whose retest cleared has `origin: 'baby'`, `status: 'passed'`. Origin never changes; status is the lifecycle projection.

### Status enum lives in `src/lib/domain/models.ts`

So that it can be referenced by both `allergen-status.ts` and any future Insight types.

### Invariants encoded in `getAllergenStatuses`

- **Latest-reintroduction-wins.** An allergen may appear in multiple reintroduction phases (initial protocol + retest phases appended via `appendReTestPhases`). Status is determined by the most recent reintroduction phase that has started on or before `date`. A clean retest of a previously-reacted allergen yields `passed`; a reacted retest of a baby allergy reverts to `permanent-baby`.
- **Reintroduction supersedes earlier `tolerance-building`.** If both a `tolerance-building` phase and a later `reintroduction` phase for the same allergen have started, the reintroduction phase drives the status.
- **Origin immutable.** `permanentMother` and `permanentBaby` arrays are not pruned when an allergen graduates. A baby allergy that cleanly retests stays in `permanentBaby` with `status: 'passed'`.
- **Closed universe.** Result length equals `|permanentMother ∪ permanentBaby ∪ protocolMembers|`. No more, no fewer.
- **Post-protocol detection.** "After the protocol" is derived from `getPhaseForDate(schedule, date) === null`, not from `estimatedEndDate` arithmetic.

### Schema split: `permanentEliminations` → `permanentMother` + `permanentBaby`

`GeneratedSchedule.permanentEliminations: string[]` is removed. Two new fields replace it, sourced directly from `QuestionnaireAnswers`:

- `permanentMother: string[]` — from `answers.motherAllergies`
- `permanentBaby: string[]` — from `answers.babyConfirmedAllergies`

The aggregate is exposed as a free function `getPermanentEliminations(schedule): string[]` for the day-view consumers that need it. No derived getter on the type itself, so `GeneratedSchedule` stays a plain serializable record (matters for Dexie storage and the encrypted manual export, per ADR-0002).

No migration code is written — the app is pre-launch (ADR-0005 shipping constraint not yet binding), and existing data on the developer machine can be wiped or regenerated from `QuestionnaireAnswers`. The Dexie schema version is bumped.

### Domain-wide rename: `'training'` → `'tolerance-building'`

The phase type literal, the status name, the reminder type (`TrainingReminder` → `ToleranceBuildingReminder`), the query function (`getTrainingRemindersForDate` → `getToleranceBuildingRemindersForDate`), the icon (🏋️ → 🥄, matching the "small spoon" mechanic), the Czech UI label ("Trénink" → "Budování tolerance"), `phase-display.ts:10`, `PhaseBadge.svelte`'s type union prop, and `docs/design/components-showcase.html` phase-badge section all change in one pass.

### `appendReTestPhases` enforces retest eligibility

The operation that appends baby-allergy retest phases gains domain-level validation. New signature:

```ts
function appendReTestPhases(
  schedule: GeneratedSchedule,
  ids: string[],
  today: string,
): Result<GeneratedSchedule, RetestRejection>;

type RetestRejection =
  | { code: 'not-baby-confirmed'; invalidIds: string[] }
  | { code: 'already-cleared'; invalidIds: string[] }
  | { code: 'retest-already-scheduled'; invalidIds: string[] };
```

`RetestRejection` lives in `schedule-builder.ts` next to its producer, not in `$lib/types/result.ts` (that module stays generic).

An id is accepted iff its current status (as of `today`) is exactly `permanent-baby` *and* the schedule does not already contain a future `reintroduction` phase for that id. The three rejection variants distinguish the failure modes so the calling route can render specific Czech copy:

- `not-baby-confirmed` — id is a mother allergy or a protocol-only allergen; was never retestable.
- `already-cleared` — id is a baby allergy whose latest retest came back clean (status `passed`).
- `retest-already-scheduled` — a future retest phase for this id already exists. A separate cancel/reschedule operation is needed to change the date; tracked as a follow-up.

### `getEliminatedSlugsForDate` becomes derived

Its public signature and return values stay identical, so existing callers and tests are unaffected. Internally it becomes:

```ts
getAllergenStatuses(schedule, date)
  .filter(s => ['permanent-mother', 'permanent-baby', 'eliminated', 'reacted', 'not-yet-tested'].includes(s.status))
  .map(s => s.id);
```

Statuses `{ testing, passed, tolerance-building }` are not forbidden (tolerance-building is allowed in small doses; the UI surfaces the dosage caveat separately). The training-recursion case in the current implementation (rebuild schedule sans training, recurse) disappears — handled as a discrete status from the start.

### `ScheduleContext` exposes `allergenStatuses`

Per ADR-0009's "all derived state bundled" principle, `ScheduleContext.ready` gains:

```ts
allergenStatuses: AllergenStatus[]; // for today
```

`eliminatedToday` becomes a filter over `allergenStatuses` internally — single source of truth inside the store. Routes consuming statuses for today read `scheduleContext.allergenStatuses`. Routes needing statuses for other dates (program timeline iterating per phase row, each with its own representative date) still call `getAllergenStatuses(schedule, otherDate)` directly. Both surfaces coexist.

### Program timeline display: two groups + origin badge

The program route's `getAllergenStatusRows` is deleted. The timeline reads `getAllergenStatuses` and groups for display:

- **Maminčiny alergeny** — entries with `origin: 'mother'`. Read-only; no retest affordance.
- **Potvrzené alergie miminka** — entries with `origin: 'baby'` AND `status: 'permanent-baby'`. Retest picker rendered.

Baby-origin allergens whose status is currently `testing` / `passed` / `reacted` from a retest cycle appear inline with the protocol-allergen rows at their respective status, with a small "z dotazníku" badge so origin survives visually. Status is the primary organising axis ("what can I eat right now?"); origin is annotation.

### `CONTEXT.md` and `UBIQUITOUS_LANGUAGE.md`

`CONTEXT.md` gains a deep `AllergenStatus` entry near `EliminationWindow`. The existing `EliminationWindow` entry references `AllergenStatus` as the source of truth from which it is now derived, and the per-phase table is updated for the rename. `UBIQUITOUS_LANGUAGE.md` adds entries for `AllergenStatus`, `permanent-mother`, `permanent-baby`, `tolerance-building`, and `RetestRejection`; the existing `training` entry is renamed.

### Migration order

1. **Schema split.** Add `permanentMother` / `permanentBaby` to `GeneratedSchedule`; remove `permanentEliminations`; introduce `getPermanentEliminations(schedule)` free function in `schedule-builder.ts`. Rewrite all test fixtures (~12 files). Bump Dexie schema version.
2. **Phase-type rename.** `'training'` → `'tolerance-building'` across `models.ts`, `schedule-builder.ts`, `schedule-queries.ts`, `phase-display.ts` (key + label "Budování tolerance" + icon 🥄), `PhaseBadge.svelte` type union, `docs/design/components-showcase.html`, route templates, tests. Rename `TrainingReminder` → `ToleranceBuildingReminder` and `getTrainingRemindersForDate` → `getToleranceBuildingRemindersForDate`. Type-literal change forces every consumer to be updated in the same commit.
3. **New `allergen-status.ts` module.** Add `AllergenStatus` type to `models.ts`; implement `getAllergenStatuses` in `allergen-status.ts` with full tests beside it.
4. **Reimplement `getEliminatedSlugsForDate`.** Collapse to filter over `getAllergenStatuses`; delete the training-recursion case and the private `getPassedAllergens` helper. Existing tests stay green.
5. **Reimplement `appendReTestPhases`.** Return `Result<GeneratedSchedule, RetestRejection>`; tests for all three rejection codes; route caller updated to handle each rejection with specific Czech copy.
6. **Extend `ScheduleContext.ready`.** Add `allergenStatuses` field; rewire `eliminatedToday` as a filter over it.
7. **Program timeline rewrite.** Delete `getAllergenStatusRows`; consume `allergenStatuses`; implement two-group display + origin badge.
8. **Documentation.** Update `CONTEXT.md` (new `AllergenStatus` entry, `EliminationWindow` reference) and `UBIQUITOUS_LANGUAGE.md`. Grep for stale references to `getPassedAllergens`, `permanentEliminations`, `training`, "alreadyReintroduced," and clean up.
9. **Follow-up issue.** Open a tracked issue for the cancel/reschedule retest operation (needed once the user discovers the `retest-already-scheduled` rejection in real use).

## Testing Decisions

### What makes a good test here

The interface is the test surface. Tests assert on the `AllergenStatus[]` produced by `getAllergenStatuses` for representative schedules — not on intermediate state, not on how the function is decomposed internally. Good tests survive any refactor that preserves the public contract.

### `getAllergenStatuses` — primary

Table-driven Vitest tests in `src/lib/domain/allergen-status.test.ts` covering:

- **Reset phase day** — all protocol allergens `not-yet-tested`; mother permanents `permanent-mother`; baby permanents `permanent-baby`.
- **Elimination phase day** — all protocol allergens `eliminated`; permanents as above.
- **Reintroduction phase day, current allergen** — current allergen `testing`; prior cleanly-completed allergens `passed`; prior reintro-then-rest allergens `reacted`; future protocol allergens `eliminated`.
- **Rest phase day immediately after a reintro** — that reintro's allergen `reacted`; everything else behaves as during reintro of *no* current allergen.
- **Tolerance-building phase day** — the tolerance-building allergen is `tolerance-building`; surrounding non-training context produces correct statuses for everyone else.
- **Post-protocol day (no active phase)** — cleanly-passed allergens stay `passed`; reacted stay `reacted`; permanents stay `permanent-mother` / `permanent-baby`; never-reintroduced protocol allergens stay `not-yet-tested`.
- **Multiple reintroductions of same allergen (latest-reintro-wins)** — protocol reacted, retest cleanly passed → `passed`. Protocol passed, retest reacted → `reacted`.
- **Baby allergy with appended retest, retest not yet started** — `permanent-baby` (origin baby).
- **Baby allergy with retest active right now** — `testing` (origin baby).
- **Baby allergy with reacted retest** — reverts to `permanent-baby` (origin baby).
- **Baby allergy with clean retest** — `passed` (origin baby).
- **Tolerance-building plus later reintroduction of same id** — reintroduction wins.
- **Sub-allergen ids (`eggs:cooked` vs `eggs:raw`)** — tracked independently as two entries.
- **Closed universe length** — result length equals `|permanentMother ∪ permanentBaby ∪ protocolMembers|`.

### `appendReTestPhases` — Result-typed rejections

Tests for each `RetestRejection` variant:
- `not-baby-confirmed` — passing a mother-allergy id; passing a protocol-only id.
- `already-cleared` — passing a baby-confirmed id whose latest retest was clean.
- `retest-already-scheduled` — passing a baby-confirmed id that already has a future retest phase.

Plus the success case: passing only `permanent-baby` ids returns `{ ok: true, data: schedule-with-appended-phases }`.

### `getEliminatedSlugsForDate` — regression

Existing tests in `schedule-queries.test.ts` stay as a behavioural contract. They must continue to pass unchanged after the refactor.

### `src/routes/program/+page.svelte` — route-level

Existing component test continues to pass. New assertions added:
- When a schedule contains a reintroduction followed by a rest, the program timeline shows that allergen as **reacted**, not "reintroduced." (The bug-fix regression test.)
- Two-group display renders mother allergies and confirmed baby allergies in separate sections; the baby section renders the retest picker, the mother section does not.
- A baby allergy whose status moved past `permanent-baby` (e.g. `testing`, `passed`) renders inline with the protocol-allergen rows with the "z dotazníku" origin badge.

### `ScheduleContext`

Existing tests continue to pass. New assertion: `ready.allergenStatuses` is populated and `eliminatedToday` matches the corresponding filter expression.

### Prior art

- `src/lib/domain/schedule-queries.test.ts` — already uses table-driven Vitest assertions over hand-built `GeneratedSchedule` fixtures. The new tests follow this pattern.
- `src/lib/domain/schedule-builder.test.ts` — same style; safe to copy fixture setup helpers.
- Component-level tests under `src/routes/program/+page.test.ts` use the `scheduleContext`-mocking pattern; new assertions slot in there.

## Out of Scope

- Structural restructure of `phase-display.ts` (Candidate 5 from the architecture review). The rename touches the keyed lookup, icon, and label; the file structure stays as-is.
- The deeper `protocolSession` refactor (Candidate 2 — promoting `ScheduleContext` to a read+write seam). Tracked separately.
- The Insight engine itself (ADR-0007 v1.1). This work *unblocks* it but does not implement it.
- Visual redesign of the program timeline. The two-group split and origin badge change the *data driving* the chips; the chip styling reuses existing primitives.
- A cancel/reschedule operation for an appended retest. The `retest-already-scheduled` rejection surfaces the need; the operation lands as a follow-up issue (migration step 9).

## Further Notes

The duplicated-definition bug is latent — it only surfaces after a reintroduction phase has been followed by a rest phase, which requires a reaction during the protocol. Easy to miss on a happy-path walkthrough; the fix is worth landing before the app reaches any device other than the developer's own (the ADR-0005 shipping constraint).

The grilling that produced this PRD also confirmed that origin and status are *separate concerns* — identity facts established at questionnaire time versus lifecycle projections that change as the protocol progresses. Conflating them is the same category error that caused the original bug, and the schema split + origin field on `AllergenStatus` are how the codebase encodes the separation going forward.
