# Ubiquitous Language — Atopic Helper

Shared vocabulary for conversations between developer and AI about this codebase.
When either party uses a term listed here, it carries exactly this meaning.

**Maintenance rule:** when a term's meaning changes in code, update this file in the same PR.
Terms already defined in depth elsewhere are referenced, not duplicated.

---

## Protocol Phases

The elimination protocol is a fixed sequence of named phases. Each phase has a `type`
(`PhaseType`) and a date range. The sequence produced by `generateSchedule()` is:
Reset → Elimination → (Reintroduction → Rest)× → Tolerance-Building×

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

### Tolerance-Building Phase
*Czech: Budování tolerance*

Open-ended maintenance phase (typically up to 3 months). The mother consumes a small
dose of a **tolerated** allergen twice weekly to build lasting tolerance. Multiple
tolerance-building phases may run concurrently (one per passed allergen). Has no fixed
end date. The `EliminationWindow` during a tolerance-building phase = same as the
concurrent non-tolerance-building phase, but the trained allergen is additionally
permitted in small doses. Phase type literal: `'tolerance-building'` (renamed from the
former `'training'` per ADR-0012). Icon: 🥄.

### ReintroductionDayInfo

Day-within-phase record returned by `getReintroductionDayInfo(schedule, date)` for
the active reintroduction phase. Contains: `dayInPhase`, `totalDays`, `allergenId`,
and `isEvaluationDay` (true on the last day, triggers verdict UI). Carries **no Czech
strings** — the render site resolves the day's dosing instruction from
`REINTRODUCTION_PROTOCOLS[allergenId].days[dayInPhase - 1].instructionCs`.

### AllergenProtocol

The static dosing config for one allergen's reintroduction phase. Shape:
`{ days: ProtocolDay[] }`. Stored in `src/lib/data/reintroduction-protocols.ts` as
`REINTRODUCTION_PROTOCOLS: Record<string, AllergenProtocol>`. v1 ships baseline
clinical guidelines only; dynamic adjustment per baby profile is deferred.

### ProtocolDay

A single day's entry within an `AllergenProtocol`:
`{ day: number, instructionCs: string, isEvaluationDay: boolean }`.
`instructionCs` is Czech dosing text (e.g. "50 g červené čočky"). `isEvaluationDay`
drives whether the verdict UI appears — it is a domain flag, not display state.

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

### Permanent Mother Allergens
*Czech: Maminčiny alergeny*

Mother's own lifelong allergies, sourced from `answers.motherAllergies`. Stored on
`GeneratedSchedule.permanentMother`. Never enter a reintroduction phase and are never
offered for retest. Always in the `EliminationWindow`. Identity is immutable.

### Permanent Baby Allergens
*Czech: Potvrzené alergie miminka*

Baby's confirmed allergies from the questionnaire, sourced from
`answers.babyConfirmedAllergies`. Stored on `GeneratedSchedule.permanentBaby`.
Eliminated by default but **eligible for end-of-program retest** via
`appendReTestPhases`. Origin is immutable — an allergen that retests cleanly stays in
`permanentBaby` with `AllergenStatus = 'passed'`.

### Permanent Eliminations (aggregate)
*Czech: Trvale vyřazené alergeny*

The union of `permanentMother` and `permanentBaby`. Exposed as a free function
`getPermanentEliminations(schedule): string[]` — not stored as a field on
`GeneratedSchedule`. Used by day-view consumers that need "anything forbidden by
identity, regardless of origin."

### Protocol Allergens

The full set of allergens eliminated during the elimination phase. Extracted from the
schedule's elimination phase. Equals `testedAllergens` minus any already-permanent
eliminations (mother or baby). Disjoint from `permanentMother` and `permanentBaby` by
construction.

### AllergenStatus
→ Defined in `CONTEXT.md`. The per-allergen lifecycle state derived by
`getAllergenStatuses(schedule, date)` in `src/lib/domain/allergen-status.ts`. One entry
per allergen in the closed universe `permanentMother ∪ permanentBaby ∪ protocolMembers`.
Status values: `permanent-mother`, `permanent-baby`, `not-yet-tested`, `eliminated`,
`testing`, `passed`, `reacted`, `tolerance-building`. Carries an `origin: 'mother' |
'baby' | 'protocol'` field so identity survives status changes. See ADR-0012.

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
with date ranges, plus `permanentMother`, `permanentBaby`, and `estimatedEndDate`.
Persisted by `ScheduleRepository`. Treated as immutable after generation — mutations
(`insertRestDays`, `appendTolerantBuildingPhase`, `appendReTestPhases`) produce a new
schedule object. The aggregate `permanentEliminations` is a derived free function, not
a stored field.

### ScheduleContext
→ Defined in `CONTEXT.md`. The reactive bundle of `GeneratedSchedule` +
`QuestionnaireAnswers` + derived protocol values consumed by all routes. Discriminated
union: `loading | empty | ready | error`.

### EczemaSeverity
*Czech: Závažnost ekzému*

Input from onboarding. One of: `'mild'` (Mírná) · `'moderate'` (Střední) · `'severe'`
(Těžká). Determines the duration of the elimination phase (14 vs. 21 days) and
influences rest phase lengths.

### ToleranceBuildingReminder

A notification generated by `getToleranceBuildingRemindersForDate(schedule, date)` when
a tolerance-building allergen has not been consumed in 3+ days — the threshold for
re-exposure. Not stored; computed on demand. (Renamed from `TrainingReminder` per
ADR-0012.)

### RetestRejection

The typed error returned by `appendReTestPhases(schedule, ids, today)` when one or more
ids cannot be retested. Discriminated union with three variants:
- `not-baby-confirmed` — id is a mother allergy or a protocol-only allergen.
- `already-cleared` — id is a baby allergy whose latest retest came back clean.
- `retest-already-scheduled` — a future retest phase for this id already exists.

Each variant carries `invalidIds: string[]` so the route can render specific Czech copy.
Defined next to its producer in `schedule-builder.ts`, not in `$lib/types/result.ts`.
See ADR-0012.

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

### AmountSize → PortionKind
*Czech: Velikost porce*

Being renamed to `PortionKind` per ADR-0014. One of: `'pinch'` (Špetka) · `'teaspoon'`
(Lžička) · `'spoon'` (Lžíce) · `'portion'` (Porce) · `'package'` (Balení).
This is the **meal-logging** portion size — what the mother recorded eating on a
`MealItem`. Distinct from `AllergenProtocol` / `ProtocolDay`, which are the
protocol-prescribed dosing instructions during reintroduction.

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

Component that renders a colored badge for a `PhaseType`. Color and label are
mapped by `getPhaseDisplay()`: Reset (gray) · Eliminace (danger) · Reintrodukce (teal)
· Odpočinek (warning) · Trénink (success).

### EczemaCheck

The daily skin assessment form component. Props: `date`, `assessment` (existing or
null), `reintroductionAllergenId` (non-null during a reintro phase, triggers contextual
pill), `onSave`. Renders the 4-button `AssessmentStatus` picker, notes textarea, and
photo toggle.

### AllergenChip

A self-contained pill chip that renders a single allergen as icon + name with full
pill chrome (rounded-full border, semantic background). Resolves `other:` prefixed
slugs (custom allergens) to a deterministic icon via hash. Props: `slug`,
`color?: 'neutral' | 'warning' | 'success'` (defaults to `'neutral'`). Color maps
to the DESIGN.md `chip-neutral` / `chip-warning` / `chip-success` tokens via
`data-state` in `app.css`. To render a list of chips, inline a `flex flex-wrap gap-1.5`
container with `{#each}` — there is no separate group component.

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

### PhaseType

The stable string-literal type used to identify a protocol phase in domain records.
Values: `'reset' | 'elimination' | 'reintroduction' | 'rest' | 'tolerance-building'`.
Domain records carry `type: PhaseType`; Czech text is resolved from `$lib/strings/phases`
(`label`, `badgeLabel`, `description`); full display config including visual tokens from `$lib/config/phases`.
See ADR-0014.

### PortionKind

The stable string-literal type for a **meal-item portion size** (rename of `AmountSize`).
Values: `'pinch' | 'teaspoon' | 'spoon' | 'portion' | 'package'`.
These are descriptive — what the mother actually logged eating on a `MealItem`.
Czech display labels live in `src/lib/strings/portions.ts`. See ADR-0014.

Not to be confused with `AllergenProtocol` / `ProtocolDay`, which are the
prescriptive dosing instructions the protocol recommends during reintroduction.

### Presentation String

A locale-bound display label resolved from a domain identifier at render time.
Presentation strings never live on domain records. Domain records carry the identifier;
`src/lib/strings/` (pure Czech text) and `src/lib/config/` (text + visual tokens)
map it to human-readable text and visual tokens.
See ADR-0014.

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
