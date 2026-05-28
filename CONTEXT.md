# Context — Atopic Helper

Domain vocabulary and invariants for the Atopic Helper app. Read before
extending the domain or naming new concepts. Update inline as decisions
crystallise; do not let it drift from the code.

## Glossary

### ScheduleContext
Today's protocol state as the UI sees it — a reactive bundle of
`GeneratedSchedule`, `QuestionnaireAnswers`, and derived protocol values
(`eliminatedToday`, `reintroInfo`, `progress`) computed for the current
date. Exposed as a discriminated union: `loading | empty | ready | error`.
Derived fields only exist on `ready`. The `error` variant carries a string
message from a failed repository load. This is an application-layer concept,
not a domain concept — it is the authoritative name for what routes consume,
as distinct from the raw `GeneratedSchedule` stored in the database.

### DailyAssessment
What the parent observed about the baby's skin on a given calendar day:
status (`improved` / `unchanged` / `worsened` / `new-lesions`), optional
free-text notes, optional photo. The form shape is identical on
ordinary days and reintro-test days — a contextual pill in the UI is
the only visual difference. There is no `suspectedCause` field;
attribution is not recorded here. See ADR-0004.

### ReintroductionEvaluation
The allergen-attributed verdict at the end of a reintro phase, picked
from four outcomes (`tolerated` / `mild-reaction` / `clear-reaction` /
`severe-reaction`). The app may suggest one as recommended from the
phase's daily observations; the user confirms. This is the *only*
place where the user explicitly attributes a reaction to an allergen.

### Insight
A *derived* pattern card computed over `(Meal, DailyAssessment)` pairs
(and the schedule). Not a stored user input. The pattern detector is a
pure function: `insights(meals, assessments, schedule) → Insight[]`.
Examples: "after dairy days, skin worsened in 3 of 4 cases — reaction
within 24h." Insights surface counter-examples too. Dismissals/pins are
UI state, not domain state.

### EliminationWindow
What the mother is forbidden to eat on a given day, derived by
`getEliminatedSlugsForDate(schedule, date)`. The result depends on the
current phase type:

| Phase | Eliminated |
|---|---|
| `reset` | Permanent eliminations only — mother eats normally otherwise |
| `elimination` | Permanent eliminations + all protocol allergens |
| `reintroduction` of X | Permanent + protocol minus X (current) minus already-passed allergens |
| `rest` | Permanent + protocol minus already-passed allergens (no current exception) |
| `tolerance-building` of X | X is allowed in small doses (status `tolerance-building` → not forbidden); every other allergen follows its own current `AllergenStatus` |
| After all phases | Permanent eliminations only |

`EliminationWindow` is now *derived from* `AllergenStatus` — the per-phase
table above is the projection rule, but the source of truth is the status
query. `getEliminatedSlugsForDate` works in two steps:

1. **Reset guard.** If the active phase is `reset` (or no phase is active),
   return only `permanentEliminations`. Protocol allergens carry status
   `eliminated` during reset (they are inside the early-phase window), but
   the mother eats them normally during reset to establish a baseline —
   forbidding them here would defeat that purpose.
2. **Status filter.** For all other phases, return ids of allergens whose
   status is in `{ permanent-mother, permanent-baby, eliminated, reacted,
   not-yet-tested }`. Statuses `{ testing, passed, tolerance-building }` are
   not forbidden.

`permanentEliminations` (the aggregate of `motherAllergies` +
`babyConfirmedAllergies`) always applies regardless of phase type. The
schedule stores `permanentMother` and `permanentBaby` as separate
fields; `permanentEliminations` is the derived concatenation for the
day-view filter.

### AllergenStatus
The per-allergen lifecycle state on a given calendar date, derived by
`getAllergenStatuses(schedule, date)`. One entry per allergen in the
*closed universe* `permanentMother ∪ permanentBaby ∪ protocolMembers`
— allergens outside that universe have no status (they are ordinary
foods, not allergens-of-interest).

Status is a discriminated string union:

| Status | Meaning |
|---|---|
| `permanent-mother` | Mother's own allergy. Lifelong. Never enters a reintroduction. Terminal. |
| `permanent-baby` | Baby's confirmed allergy. Eliminated by default; eligible for end-of-program retest via `appendReTestPhases`. |
| `not-yet-tested` | Protocol allergen with a reintroduction phase still in the future, or never scheduled. |
| `eliminated` | Currently inside the active `elimination` (or `reset`) phase. |
| `testing` | Currently inside a `reintroduction` phase. |
| `passed` | Latest reintroduction completed cleanly (no rest follow-up). |
| `reacted` | Latest reintroduction was followed by a rest phase (reaction signal). |
| `tolerance-building` | Open-ended `tolerance-building` phase active for this allergen. |

**Invariants:**

- *Latest-reintroduction wins.* An allergen may appear in multiple
  reintroduction phases (initial protocol + retest phases appended via
  `appendReTestPhases`). Status is determined by the most recent
  reintroduction phase that has started on or before `date`.
- *Reintroduction supersedes earlier `tolerance-building`.* If both a
  `tolerance-building` phase and a later `reintroduction` phase for the
  same allergen have started, the reintroduction phase drives the
  status.
- *Origin survives clearance.* A `permanent-mother` allergen never
  becomes `testing` — no domain operation creates a reintroduction
  phase for one. A `permanent-baby` allergen with a future retest phase
  remains `permanent-baby` until that phase activates; on activation it
  becomes `testing`, then either `passed` (clean retest) or reverts to
  `permanent-baby` (reacted retest).
- *Closed universe.* `getAllergenStatuses(schedule, date)` returns
  exactly `|permanentMother ∪ permanentBaby ∪ protocolMembers|` entries.
  No more, no fewer. The three sets are disjoint by construction
  (the protocol generator excludes permanents from `protocolMembers`).

See [ADR-0012](docs/adr/0012-allergen-status-lifecycle.md).

### Actor
The person whose food intake a `Meal` describes. In v1 always `'mother'`
(the breastfeeding mother — allergens transit to the baby via breastmilk).
The `actor` field is reserved on `Meal` for future expansion to `'baby'`
once solids-introduction is in scope, but v1 writes only `'mother'`.

**Why the field exists now:** committing to dual-actor logic in v1 would
fork the schedule generator (mother eliminates X *and* baby solids skip X
on a different timeline). Reserving the field is cheap; retrofitting it
after data exists is a migration.

**Invariant:** every `Meal` has an `actor`. In v1, `actor === 'mother'`.

---

## Invariants

- **Single device, single actor.** v1 runs on one phone (the mother's).
  No accounts, no sync, no server. See [ADR-0001](docs/adr/0001-single-device-v1.md).
- **Encrypted manual export is the backup floor.** Every persisted record
  has a stable UUID. Whole-state serialize + AES-256-GCM with a
  passphrase-derived key is built in v1. Cloud/auto-backup is deferred.
  See [ADR-0002](docs/adr/0002-backup-floor.md).
- **Meals are day-granular.** `Meal` carries `date` + `mealType` only.
  No user-facing meal times. `createdAt` / `updatedAt` are system-stamped
  for audit. See [ADR-0003](docs/adr/0003-day-granular-meals.md).
- **One `Meal` per date+mealType slot.** A given `(date, mealType)` pair
  maps to exactly one `Meal` record. The record is upserted (not appended)
  when the user commits the basket. `Meal.id` is the deterministic
  composite key `"${date}:${mealType}"` (e.g. `"2026-05-27:lunch"`).
- **Causation is derived, not recorded.** The user logs only ground
  truth (meals, daily skin status, end-of-phase reintro verdict). The
  app derives suspected patterns via a pattern detector over those
  logs. No `suspectedCause` field on `DailyAssessment`.
  See [ADR-0004](docs/adr/0004-causation-derived-not-recorded.md).
- **Photo encryption-at-rest deferred past v1** — with a shipping
  constraint: encryption must land before the app reaches any device
  other than the developer's own.
  See [ADR-0005](docs/adr/0005-photo-encryption-deferred.md).
- **Persistence: Dexie/IndexedDB, normalized tables.** Photos in a
  dedicated table. Reactive UI via `liveQuery`. The insight engine
  receives plain arrays — it does not know Dexie exists.
  See [ADR-0006](docs/adr/0006-dexie-persistence.md).
- **v1 ships the Protocol Executor.** Onboarding, today view, meal-add
  with conflict detection, day detail, program timeline, end-of-reintro
  verdict, encrypted export. Insight engine deferred to v1.1.
  See [ADR-0007](docs/adr/0007-v1-scope.md).
- **Tracer-bullet slice order**: (1) Onboarding + Today read-only, (2)
  Log a meal → see it on today, (3) Daily assessment + photo. Then the
  remaining v1 screens.
  See [ADR-0008](docs/adr/0008-tracer-bullet-slices.md).
- **Domain records carry types, not display strings.** Domain-emitted
  records (`SchedulePhase`, `MealItem`, etc.) carry stable type
  identifiers (e.g. `type: 'elimination'`). Czech display text and visual
  tokens live in `src/lib/strings/` (pure text) and `src/lib/config/`
  (text + visual tokens combined), resolved at render time. Baking
  a display string onto a domain record violates this invariant.
  See [ADR-0014](docs/adr/0014-presentation-strings-and-domain-keys.md).
