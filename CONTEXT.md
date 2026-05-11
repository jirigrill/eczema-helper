# Context — Atopic Helper

Domain vocabulary and invariants for the Atopic Helper app. Read before
extending the domain or naming new concepts. Update inline as decisions
crystallise; do not let it drift from the code.

## Glossary

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
