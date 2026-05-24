# Ubiquitous Language — Atopic Helper

Shared vocabulary for conversations between developer and AI about this codebase.
When either party uses a term listed here, it carries exactly this meaning.

**Maintenance rule:** when a term's meaning changes in code, update this file in the same PR.
Terms already defined in depth elsewhere are referenced, not duplicated.

---

## Protocol Phases

The elimination protocol is a fixed sequence of named phases. Each phase has a `type`
(`SchedulePhaseType`) and a date range. The sequence produced by `generateSchedule()` is:
Reset → Elimination → (Reintroduction → Rest)× → Training×

### Reset Phase
*Czech: Resetovací fáze*

5-7 day baseline period that opens the protocol. The mother eats normally (except confirmed
permanent eliminations) while the baby's baseline skin state is documented. No foods are
yet removed from the protocol list — this establishes the "before" reference.

### Elimination Phase
*Czech: Eliminační fáze*

Complete removal of all protocol allergens from the mother's diet. Duration: 14 days
(mild/moderate eczema) or 21 days (severe). Ends when skin has stabilised. The
`EliminationWindow` during this phase = permanent eliminations + all protocol allergens.

### Reintroduction Phase
*Czech: Fáze znovuzavedení / Reintrodukce*

A 3-4 day sequential test of one allergen at escalating doses (small → medium →
unrestricted → unrestricted) except milk alleren, which takes 5 days. One allergen
at a time, in the order defined by `testedAllergens`. The `EliminationWindow` 
opens an exception for the current allergen. Ends with a `ReintroductionEvaluation` 
verdict on day 3 or 4. → See `CONTEXT.md` for `ReintroductionEvaluation`.

### Rest Phase
*Czech: Klidový režim / Odpočinek*

3–7 day recovery after a reintroduction. Mother eats only tolerated foods. The presence
of a rest phase immediately following a reintro phase **signals a reaction** — the
allergen stays eliminated until re-tested. An allergen counts as **passed** only when
its reintro is *not* followed by a rest phase. → See `EliminationWindow` in `CONTEXT.md`.

### Training Phase
*Czech: Trénink*

Open-ended maintenance phase (typically up to 3 months). The mother consumes a small
dose of a **tolerated** allergen twice weekly to build lasting tolerance. Multiple
training phases may run concurrently (one per passed allergen). Has no fixed end date.
The `EliminationWindow` during training = same as the concurrent non-training phase,
but the training allergen is additionally permitted in small doses.

### ReintroductionDayInfo

Day-within-phase guidance returned by `getReintroductionDayInfo(schedule, date)` for
the active reintroduction phase. Contains: `label` (e.g. "Den 1 / 4"), `guidance`
(dose instruction), and `isEvaluationDay` (true on day 4, triggers verdict UI).

---

## Allergens & Elimination

### Allergen / Allergen Slug
*Czech: Alergen*

A food trigger substance identified by a string slug (e.g. `'dairy'`, `'eggs'`,
`'wheat'`). Slugs are the stable IDs used in schedules, meals, and elimination windows.
The display name and icon are resolved from the slug at render time.

### Tested Allergens
*Czech: Sledované alergeny*

The ordered list of allergens the protocol will eliminate and then reintroduce
sequentially. Set during onboarding. Default order: `['soy', 'wheat', 'eggs', 'dairy']`
(least → most common trigger). Drives the reintroduction sequence in `generateSchedule()`.

### Permanent Eliminations
*Czech: Trvale vyřazené alergeny*

The union of `motherAllergies` and `babyConfirmedAllergies` from `QuestionnaireAnswers`.
These allergens are **always forbidden regardless of phase type**, including during
training and after all protocol phases end. Never reintroduced.

### Protocol Allergens

The full set of allergens eliminated during the elimination phase. Extracted from the
schedule's elimination phase. Equals `testedAllergens` minus any already-permanent
eliminations.

### Passed Allergens

Allergens whose reintroduction phase was **not** immediately followed by a rest phase,
meaning the body tolerated them. Computed by `getPassedAllergens(schedule)`. Passed
allergens are no longer in the `EliminationWindow` after their reintro phase ends.

### EliminationWindow
→ Defined in `CONTEXT.md`. The set of allergens the mother may not eat on a given date,
derived by `getEliminatedSlugsForDate(schedule, date)`.

### Conflict Detection

Identifying `MealItem`s in a logged meal that violate the current `EliminationWindow`.
Performed by `detectConflicts(meal, eliminatedSlugs)`. Surfaces a warning before the
user saves a meal.

---

## Schedule & Questionnaire

### QuestionnaireAnswers

The parent's intake data collected during onboarding:
- `babyBirthDate` — ISO date
- `eczemaSeverity` — `'mild' | 'moderate' | 'severe'`
- `motherAllergies` — allergen slugs (permanent eliminations)
- `babyConfirmedAllergies` — allergen slugs (permanent eliminations)
- `testedAllergens` — ordered protocol allergen list
- `programStartDate` — ISO date (defaults to today)

Persisted by `QuestionnaireRepository`. Source of truth for `generateSchedule()`.

### GeneratedSchedule

The output of `generateSchedule(answers)`: an ordered array of `SchedulePhase` objects
with date ranges, plus `permanentEliminations` and `estimatedEndDate`. Persisted by
`ScheduleRepository`. Treated as immutable after generation — mutations (adding rest
days, training phases) produce a new schedule object.

### ScheduleContext
→ Defined in `CONTEXT.md`. The reactive bundle of `GeneratedSchedule` +
`QuestionnaireAnswers` + derived protocol values consumed by all routes. Discriminated
union: `loading | empty | ready | error`.

### EczemaSeverity
*Czech: Závažnost ekzému*

Input from onboarding. One of: `'mild'` (Mírná) · `'moderate'` (Střední) · `'severe'`
(Těžká). Determines the duration of the elimination phase (14 vs. 21 days) and
influences rest phase lengths.

### TrainingReminder

A notification generated by `getTrainingRemindersForDate(schedule, date)` when a
training allergen has not been consumed in 3+ days — the threshold for re-exposure.
Not stored; computed on demand.

---

## Meals

### Meal
*Czech: Jídlo*

A record of the mother's food intake on a single date. Contains: `date`, `mealType`,
`items` (list of `MealItem`), optional `label`, `actor` (always `'mother'` in v1),
`savedAt`. Meals are day-granular — no user-facing time of day. → See ADR-0003.

### MealType
*Czech: Typ jídla*

One of: `'breakfast'` (Snídaně) · `'lunch'` (Oběd) · `'snack'` (Svačina) ·
`'dinner'` (Večeře).

### MealItem
*Czech: Položka jídla*

A single food within a meal: `name`, `categoryId` (allergen slug), optional `subitemId`,
`amount` (AmountSize).

### AmountSize
*Czech: Velikost porce*

One of: `'pinch'` (Špetka) · `'teaspoon'` (Lžička) · `'spoon'` (Lžíce) ·
`'portion'` (Porce) · `'package'` (Balení).

### Actor
→ Defined in `CONTEXT.md`. The person whose food intake a `Meal` describes. Always
`'mother'` in v1.

---

## Assessment & Observation

### DailyAssessment
→ Defined in `CONTEXT.md`. The parent's observation of the baby's skin on a calendar
day: `AssessmentStatus`, optional notes, optional photo.

### AssessmentStatus
*Czech: Stav kůže*

One of: `'improved'` (Zlepšení) · `'unchanged'` (Beze změny) · `'worsened'`
(Zhoršení) · `'new-lesions'` (Nová ložiska). Selected by the parent daily.

### ReintroductionEvaluation
→ Defined in `CONTEXT.md`. The allergen-attributed verdict at the end of a
reintroduction phase. The only place causation is explicitly recorded.

### AllergenOutcome

The four possible verdicts in a `ReintroductionEvaluation`:
`'tolerated'` (Toleruje) · `'mild-reaction'` (Mírná reakce) ·
`'clear-reaction'` (Jasná reakce) · `'severe-reaction'` (Silná reakce).

### Insight
→ Defined in `CONTEXT.md`. A derived pattern card computed over `(Meal, DailyAssessment)`
pairs. Not user input. Deferred to v1.1.

---

## UI Screens

Route names and their Czech display labels:

| Route | Czech label | Purpose |
|-------|-------------|---------|
| `/` | Průvodce / Nastavení | Onboarding questionnaire (6 steps) |
| `/today` | Dnes | Daily hub: week strip, skin status, meal log |
| `/week` | Týden | Weekly overview: insights, photo gallery |
| `/program` | Postup | Full protocol timeline with phase details |
| `/meal` | Přidat jídlo | Meal logging form |
| `/settings` | Nastavení | App configuration (v1.1) |

### Onboarding
*Czech: Průvodce*

The 6-step questionnaire that collects `QuestionnaireAnswers` and generates the initial
`GeneratedSchedule`. Steps: baby birth date → eczema severity → mother allergies →
baby confirmed allergies → program start date → summary.

### Today Screen (Dnes)

Primary daily action screen. Contains: `WeekStrip`, program `ProgressStrip`, skin
status card (`EczemaCheck`), meal log section, task checklist. The main screen a user
opens each day.

### Program Screen (Postup)

Read-only timeline of all protocol phases. Shows phase dates, current position,
`PermanentEliminations`, reintroduction instructions, and re-test options.

---

## UI Patterns & Components

### WeekStrip
*Czech: 7-denní páska*

A 7-column grid showing the past 6 days + today. Each cell shows: uppercase 2-char
day abbreviation (`Po`, `Út` …), day number, and a `SeverityDot`. Today's cell is
highlighted in the primary color.

### SeverityDot
*Czech: Puntík závažnosti*

A 6×6 px color-coded circle on a `WeekStrip` cell indicating the baby's recorded skin
state for that day. Color maps to the 5-point severity scale (`sev-1` green → `sev-5`
red). Empty if no assessment recorded.

### ProgressStrip
*Czech: Pruh pokroku*

Inline meta line showing `phase name · day N / total` plus a 4 px progress bar.
Appears on the Today and Week screens. Driven by `getScheduleProgress()`.

### PhaseBadge

Component that renders a colored badge for a `SchedulePhaseType`. Color and label are
mapped by `getPhaseDisplay()`: Reset (gray) · Eliminace (danger) · Reintrodukce (teal)
· Odpočinek (warning) · Trénink (success).

### EczemaCheck

The daily skin assessment form component. Props: `date`, `assessment` (existing or
null), `reintroductionAllergenId` (non-null during a reintro phase, triggers contextual
pill), `onSave`. Renders the 4-button `AssessmentStatus` picker, notes textarea, and
photo toggle.

### AllergenChip

Renders a single allergen as an icon + name pill. Resolves `other:` prefixed slugs
(custom allergens) to a deterministic icon via hash. Props: `slug`, `muted`, `bare`.

### EmptyStateCard

Dashed-border card shown when data for a section is missing (no meal logged, no
assessment recorded). Signals actionable absence, not an error.

---

## Architecture Terms

### Ports & Adapters

The architectural pattern used for persistence. **Ports** are TypeScript interfaces in
`src/lib/domain/ports/` (e.g. `ScheduleRepository`, `QuestionnaireRepository`). **Adapters**
are concrete implementations in `src/lib/adapters/` (e.g. `DexieScheduleRepository`,
`InMemoryScheduleRepository`). Domain logic depends only on the port interfaces.

### ScheduleRepository / QuestionnaireRepository

Ports (interfaces) for persisting and loading the two core data objects. Implementations:
`Dexie*` (production) and `InMemory*` (tests). Both follow the `Result<T, E>` return
convention for `save` / `load` operations.

### Result\<T, E\>

Discriminated union for fallible operations: `{ ok: true; data: T } | { ok: false; error: string }`.
Used by all repository methods. Prevents silent swallowing of persistence errors.

### Singleton ID

The constant string `'singleton'` used as the primary key for both `answers` and
`schedule` tables in Dexie. v1 is single-user — exactly one row per table.
→ See ADR-0001.

### ISO Date

`YYYY-MM-DD` string. The standard date representation throughout the codebase.
Never use `Date` objects across module boundaries; convert at the edge.

---

## Cross-References

| For details on… | See… |
|-----------------|------|
| Deep domain invariants | `CONTEXT.md` |
| Architectural decisions | `docs/adr/` |
| Color tokens, typography, spacing | `DESIGN.md` |
| Project status + directory layout | `docs/README.md` |
| Component variants (visual) | `docs/design/components-showcase.html` |
| All screens (interactive prototype) | `docs/design/redesign-prototype.html` |
