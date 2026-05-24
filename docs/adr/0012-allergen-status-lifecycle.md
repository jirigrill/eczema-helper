# 0012 — AllergenStatus as the authoritative per-allergen lifecycle

**Status:** Accepted
**Date:** 2026-05-24

## Context

Two places in the codebase answered "what is this allergen's status today?"
and disagreed:

- `getEliminatedSlugsForDate` in `src/lib/domain/schedule-queries.ts` —
  treats an allergen as cleared only if its reintroduction phase is *not*
  immediately followed by a rest phase. Rest = reaction signal.
- `getAllergenStatusRows` inside `src/routes/program/+page.svelte` —
  treats every prior reintroduction as cleared regardless of the
  rest-phase follow-up.

The mismatch is latent until a reaction actually occurs during the
protocol, at which point the program timeline and the day view disagree.
Beyond the bug, the underlying gap is a missing named concept: no shared
vocabulary for "an allergen's current state in the lifecycle." The next
consumer (v1.1 Insight engine, end-of-program summary, settings status
card) would invent a third definition.

Two further problems surfaced while resolving this:

- `permanentEliminations` aggregates two different domain origins —
  `motherAllergies` and `babyConfirmedAllergies` — under one flat array.
  Mother's allergies are lifelong and never re-tested; baby's confirmed
  allergies are eliminated *but eligible* for end-of-program re-test via
  `appendReTestPhases`. Treating them as the same status loses load-bearing
  information.
- The `'training'` phase type names the *method* (small repeated doses),
  not the *goal* (building tolerance to a confirmed allergen). The Czech
  UI copy already describes it as "budování tolerance"; the domain
  literal lags the intent.

## Decision

Introduce `AllergenStatus` as the single derived concept for per-allergen
lifecycle. One pure query — `getAllergenStatuses(schedule, date)` — owns
the rule set; every view filters or maps over its output.

### Status enum

Discriminated string union, kebab-case for compound names:

| Status | Meaning |
|---|---|
| `permanent-mother` | Mother's own allergy. Lifelong. Never enters a reintroduction. |
| `permanent-baby` | Baby's confirmed allergy. Eliminated by default; eligible for end-of-program re-test. |
| `not-yet-tested` | Protocol allergen with a reintroduction phase still in the future, or never scheduled. |
| `eliminated` | Currently inside the active `elimination` (or `reset`) phase. |
| `testing` | Currently inside a `reintroduction` phase. |
| `passed` | Latest reintroduction completed cleanly (no rest follow-up). Terminal unless a future retest is scheduled. |
| `reacted` | Latest reintroduction was followed by a rest phase. |
| `tolerance-building` | Open-ended phase delivering small doses to build tolerance. |

### Schema split

`GeneratedSchedule.permanentEliminations: string[]` is replaced by two
fields whose union has the same membership but preserves origin:

- `permanentMother: string[]` — from `QuestionnaireAnswers.motherAllergies`.
- `permanentBaby: string[]` — from `QuestionnaireAnswers.babyConfirmedAllergies`.

`permanentEliminations` becomes a derived getter (concatenation) for
existing callers that only need the aggregate forbidden-set.

### Rename: `training` → `tolerance-building`

The phase type literal, the status, the reminder type
(`TrainingReminder` → `ToleranceBuildingReminder`), the query function
(`getTrainingRemindersForDate` → `getToleranceBuildingRemindersForDate`),
and the Czech UI label ("trénink" → "budování tolerance") all change in
one pass.

### Invariants encoded in `getAllergenStatuses`

- **Latest reintroduction wins.** An allergen may appear in multiple
  reintroduction phases (initial protocol + re-test phases appended via
  `appendReTestPhases`). Status is determined by the most recent
  reintroduction phase that has started on or before `date`. A clean
  retest of a previously-reacted allergen yields `passed`; a failed
  retest of a baby allergy reverts to `permanent-baby`.
- **Reintroduction supersedes earlier `tolerance-building`.** If an
  allergen has both a `tolerance-building` phase and a later
  `reintroduction` phase that has started, the reintroduction phase
  drives the status.
- **Origin survives clearance.** A `permanent-mother` allergen can never
  become `testing` — no domain operation creates a reintroduction phase
  for one. A `permanent-baby` allergen that has a future retest phase
  appended remains `permanent-baby` until that phase activates; on
  activation it becomes `testing`, then either `passed` or
  `permanent-baby` again.

### `appendReTestPhases` enforces retest eligibility

The operation that mutates the schedule to add baby-allergy retest phases
gains domain-level validation. Its new signature:

```ts
appendReTestPhases(
  schedule: GeneratedSchedule,
  ids: string[],
  today: string
): Result<GeneratedSchedule, RetestRejection>;

type RetestRejection =
  | { code: 'not-baby-confirmed'; invalidIds: string[] }
  | { code: 'already-cleared'; invalidIds: string[] }
  | { code: 'retest-already-scheduled'; invalidIds: string[] };
```

An id is accepted iff its current status (as of `today`) is exactly
`permanent-baby` *and* the schedule does not already contain a future
`reintroduction` phase for that id. The three rejection variants
distinguish the failure modes so the calling UI can render specific
copy:

- `not-baby-confirmed` — id is a mother allergy or a protocol-only
  allergen; was never retestable.
- `already-cleared` — id is a baby allergy whose latest retest came
  back clean (status `passed`). Re-testing is not offered.
- `retest-already-scheduled` — a future retest phase for this id
  already exists (covers both "active retest in progress" and
  "appended but not yet started"). A separate cancel/reschedule
  operation is needed to change the date; tracked as a follow-up.

The type lives next to its producer in `schedule-builder.ts`, not in
`$lib/types/result.ts` — that module stays generic.

### `getEliminatedSlugsForDate` becomes derived

Its public signature and return values stay identical, so existing
callers and tests are unaffected. Internally it collapses to a filter
over `getAllergenStatuses` — the "what is forbidden today" semantics are
the union of statuses `{ permanent-mother, permanent-baby, eliminated,
reacted, not-yet-tested }`. Statuses `{ testing, passed,
tolerance-building }` are not forbidden (tolerance-building is allowed
in small doses; the UI surfaces the dosage caveat separately).

## Consequences

- `getAllergenStatusRows` in `src/routes/program/+page.svelte` is
  deleted. The program timeline reads `getAllergenStatuses` and groups
  for display only.
- The training-phase recursion case in `getEliminatedSlugsForDate`
  (rebuild schedule sans training, recurse) disappears — handled as a
  discrete status from the start.
- IndexedDB schema version is bumped. No upgrade hook is written —
  the app is pre-launch (ADR-0005 shipping constraint not yet
  binding), the only existing data is on the developer's machine, and
  re-running onboarding regenerates a schedule from
  `QuestionnaireAnswers`. The first migration that affects real users
  will need a proper upgrade hook; this is not it.
- `CONTEXT.md` gains a deep `AllergenStatus` entry near
  `EliminationWindow`. `UBIQUITOUS_LANGUAGE.md` indexes it. The
  `EliminationWindow` entry references `AllergenStatus` as the source of
  truth from which it is now derived.
- The Insight engine (v1.1, ADR-0007) and any future status surface
  consume `getAllergenStatuses` instead of re-deriving the predicate.
- `ScheduleContext.ready` (ADR-0009) gains `allergenStatuses:
  AllergenStatus[]` — computed for today's date alongside the existing
  derived fields. `eliminatedToday` becomes a filter over
  `allergenStatuses` internally. Routes that need statuses for a date
  other than today (program timeline per-phase rows) still call
  `getAllergenStatuses(schedule, otherDate)` directly.

## Why these names

`permanent-mother` / `permanent-baby` over a single `permanent` with an
`origin` flag: keeps `AllergenStatus` a flat discriminated union, so
every consumer's `switch` is exhaustive without a secondary discriminator.

`tolerance-building` over `training`: names the goal, not the method.
The previous name read as gym jargon in a paediatric-allergy context.

`passed` / `reacted` over `tolerated` / `failed`: matches the verb-tense
pattern of `testing` and avoids the moral framing of "failed."

`not-yet-tested` over `pending`: `pending` is overloaded with UI loading
state.

## Why the schema split, not a second argument

`getAllergenStatuses(schedule, date)` stays a pure function of
`GeneratedSchedule` plus the current date. Adding `QuestionnaireAnswers`
as a parameter would couple a domain derivation to upstream form data
and create two competing sources of truth for "is this allergen from the
mother or the baby?" The schedule is the canonical projection of the
questionnaire; the status query reads only the schedule.
