# V2 Prototype: Schedule-Driven Elimination Diet Tracker

## Context

The app is shifting from a manual elimination/reintroduction toggle approach to a **schedule-driven** model:
1. App provides a preset elimination/reintroduction program
2. Onboarding questionnaire personalizes the schedule
3. Mother's daily task: log meals + take photos
4. App derives status by comparing meals against schedule, detects conflicts

All prototype screens are self-contained (no API, no stores, no Dexie). Hardcoded data, state in localStorage. Czech UI. Tested on mobile via `just dev` at `/prototype/v2/`.

## File Structure

```
src/routes/prototype/v2/
  +layout.svelte              -- Prototype shell (header toggle + dev panel)
  +page.svelte                -- Onboarding questionnaire (6-step)
  program/+page.svelte        -- Unified program page (hero card + flat timeline)
  meal/+page.svelte           -- Meal logging with conflict detection
  day/+page.svelte            -- Day detail (schedule + meals + assessment + evaluation)
  settings/+page.svelte       -- Prototype reset + answers summary
  _lib/
    types.ts                  -- Prototype-specific TypeScript types
    data.ts                   -- Hardcoded food categories, demo meals, labels
    schedule-engine.ts        -- Schedule generation + conflict detection + demo data (pure functions)
    CategoryGrid.svelte       -- Food category grid with sub-item expansion + custom allergen input
    EczemaCheck.svelte        -- Daily eczema assessment component
```

## Design System (from existing codebase)

Use existing Tailwind tokens from `src/app.css`:
- Primary: `bg-primary` (#8B4557 burgundy), `text-primary`
- Surface: `bg-surface` (#FAF8F8), `border-surface-dark`
- Text: `text-text`, `text-text-muted`
- Status: `text-success`/`bg-success` (green), `text-danger`/`bg-danger` (red), `text-warning`/`bg-warning` (amber)
- Severity colors: `severity-1` through `severity-5` (green→red)
- Cards: `bg-white border border-surface-dark rounded-xl`
- Buttons: `bg-primary text-white rounded-lg py-2.5 font-medium`

## State Management

`localStorage` key `v2-prototype-state` stores JSON:
```typescript
type PrototypeState = {
  answers: QuestionnaireAnswers | null;
  schedule: GeneratedSchedule | null;
  meals: PrototypeMeal[];
  assessments: DailyAssessment[];
  evaluations: ReintroductionEvaluation[];
  dateOffset?: number; // days relative to today for date simulation
};
```

Each screen reads/writes this key. Survives navigation and refresh.

## Allergen Sources

Two sources of allergens in the program:

1. **Protocol allergens** — standard elimination program allergens (dairy, eggs, wheat, soy) that every user gets. These are eliminated and then sequentially reintroduced to test the baby's reaction.
2. **Mother's personal allergens** — foods the mother herself is allergic/intolerant to (e.g., seafood, nuts). Discovered during onboarding. These are **permanently eliminated** because the mother avoids them anyway — they're not part of the reintroduction trial. However, they need tracking because accidental exposure (e.g., hidden nuts in a sauce) would affect the baby.

The questionnaire distinguishes:
- "Are **you** allergic or intolerant to any foods?" → mother's personal allergens (permanent, no reintroduction)
- "Does your **baby** have confirmed allergies from a doctor?" → baby's confirmed allergens (permanent, no reintroduction)
- Both result in permanent elimination, but the distinction matters for future medical reports

## Default Elimination Protocol

- **Phase 0 — Reset** (5 days): Short mandatory baseline period. Mother eats normally (except permanent eliminations). Establishes baseline skin state. **End-of-phase evaluation** on last day documents baseline.
- **Phase A — Elimination** (14 days, 21 for severe): Continue eliminating all protocol allergens. Waiting for baby's gut to respond and skin to stabilize.
- **Phase B — Sequential reintroduction** (5 days each, 7 for severe): Reintroduce one protocol allergen at a time. Includes eating days (gradual dosing) + observation days within each phase. Daily eczema assessments tracked via `EczemaCheck`. **End-of-phase evaluation** on last day: 4 outcomes (tolerated / mild / clear / severe reaction). Evaluation + daily summaries shown in program timeline.

Mother's personal allergens and baby's confirmed allergies stay eliminated throughout — they never enter the reintroduction queue.

Questionnaire modifications:
| Answer | Effect |
|--------|--------|
| Mother allergic to X | Permanent elimination, never reintroduce (mother's own restriction) |
| Baby confirmed allergy to X | Permanent elimination, never reintroduce |
| Severe eczema | 21-day elimination, 7-day reintroduction windows |
| Mild eczema | Default timings, potentially reintroduce in pairs |

Schedule start date = user-selectable during onboarding (Step 5). Default = today.

## Screen Designs

### 1. Onboarding Questionnaire (`+page.svelte`)

Full-screen, no bottom nav. One question per screen with slide transitions. Progress bar at top.

**Step 1 — Welcome**
- Icon (🌿), headline "Vitejte v pruvodci eliminacni dietou"
- Brief explanation (2-3 sentences)
- CTA: "Zacit"

**Step 2 — Baby info**
- Native date picker for birth date (`<input type="date">`)
- Severity selector: 3 large tap-target cards with colored left borders:
  - **Mirna** (mild, green border): "Obcasne suche fleky, minimalni svedeni" → 14-day elimination, 5-day reintroduction
  - **Stredni** (moderate, amber border): "Caste zarudnuti, svedeni narusuje spanek" → 14-day elimination, 5-day reintroduction
  - **Tezka** (severe, red border): "Rozsahly ekzem, silne svedeni, mozne krvaceni" → 21-day elimination, 7-day reintroduction

**Severity determination — future evolution:**
- **Now (prototype):** Mother self-reports from descriptive cards
- **Near-term:** Structured questionnaire (SCORAD-like: body area %, redness, sleep disruption) → computed severity
- **Future:** AI photo analysis (Claude Vision) scores severity from skin photos, auto-adjusts protocol timings over time

**Step 3 — Mother's own allergies/intolerances**
- "Mate vy sama alergii nebo intoleranci na nekterou potravinu?"
- CategoryGrid component: 3-column grid of all food categories (emoji + name), multi-select
- Explanation: "Tyto potraviny budou trvale vyrazeny, protoze je samy nejite"
- Skip: "Nemam zadnou alergii"

**Step 4 — Baby's confirmed allergies**
- "Ma vase dite potvrzenou alergii od lekare?"
- Same CategoryGrid but danger-colored selection (categories already selected in Step 3 are greyed out — already permanent)
- Warning: "Potvrzené alergeny budou po dobu diety vyřazeny. Jejich otestování a případné znovu zařazení by mělo proběhnout velmi opatrně či s lékařem."
- Skip: "Zadne potvrzene alergie"

**Step 5 — Program start date**
- Native date picker for start date (default = today, min = today)
- Explanation: reset phase starts on this date
- CTA: "Pokračovat"

**Step 6 — Summary**
- Review card with all answers including start date
- Generated schedule preview (timeline with phase durations)
- Edit buttons per section
- CTA: "Potvrdit a spustit program" → save to localStorage, navigate to program

### 2. Program (`program/+page.svelte`)

Header toggle visible (Program / Dnes).

- **Hero card**: merged progress ring + current phase info + eliminated chips + phase-aware CTA — single card for today's context
- **Flat timeline**: vertical line with nodes for all phases:
  - **Completed** — ✓ node, phase name, eval badge (✅/🟡/🟠/🔴), date range. Tap to expand: description, meal count, assessment summary, evaluation, per-allergen rows
  - **Current** — highlighted node with "Teď" badge. No expand (hero card covers details)
  - **Upcoming** — muted node, phase name, duration. Read-only, not tappable
- **End-of-program card**: re-test flow for confirmed baby allergies

### 3. Meal Logging (`meal/+page.svelte`)

Bottom tab bar visible.

- **Schedule context banner** (sticky): "Dnes vyrazeno: 🥛🥚🌾🫘" 
- **Meal type selector**: 4 horizontal buttons (Snidane/Obed/Svacina/Vecere)
- **CategoryGrid picker**: tap category → expand sub-items → tap to add
- **Amount selector**: per-item popover (Spetka/Lzicka/Lzice/Porce/Baleni)
- **Conflict detection (real-time)**: amber chip + warning banner when item is from eliminated category
- **Meal basket**: selected items as chips with amounts, removable
- **Save**: optional label + "Ulozit jidlo" button

### 4. Day Detail (`day/+page.svelte`)

Header toggle visible (Program / Dnes).

- **Date strip**: horizontal scroll, all days from schedule start to today, with indicator dots (green=meals, amber=conflicts, blue=assessment)
- **Schedule status card**: current phase, eliminated/allowed categories
- **Dosing guidance card**: during reintroduction, shows day-in-phase label + guidance text
- **Eczema assessment**: `EczemaCheck` component with 4 status buttons + notes + photo toggle
- **Meals section**: list of logged meals, conflict items highlighted amber
- **Conflict summary card** (if any): amber card listing deviations

## Layout (`+layout.svelte`)

- No auth required
- Sticky header with segment toggle: 📅 Program / 📊 Dnes (hidden during onboarding)
- ← Zpět button for sub-pages (meal, settings), ⚙️ settings gear on right
- Reads localStorage to check onboarding status; redirects to questionnaire if incomplete
- Floating dev panel (bottom-right): date simulation (« ↺ »), jump-to-end (⏭), compact/full view toggle
- `bg-surface` background, safe-area padding

## Key Algorithms

### Schedule generation
`generateSchedule(answers)` returns phases array with dates, types, and category slugs.

```
function generateSchedule(answers):
  phases = []
  currentDate = answers.programStartDate

  eliminationDays = severity === 'severe' ? 21 : 14
  reintroductionDays = severity === 'severe' ? 7 : 5
  resetDays = 5
  observationDays = 7

  protocolAllergens = ['dairy', 'eggs', 'wheat', 'soy']
  permanentEliminations = [...answers.motherAllergies, ...answers.babyAllergies]

  // Phase 0: Reset
  phases.push({ type: 'reset', ... })
  currentDate += resetDays

  // Phase A: Elimination  
  phases.push({ type: 'elimination', ... })
  currentDate += eliminationDays

  // Phase B: Sequential reintroduction (eating + observation days within each phase)
  reintroQueue = ['soy', 'wheat', 'eggs', 'dairy'].filter(s => !permanentEliminations.includes(s))
  for each slug in reintroQueue:
    phases.push({ type: 'reintroduction', categorySlugs: [slug] })
    currentDate += reintroductionDays
    // No separate evaluation phase — evaluation happens on last day of reintroduction

  // No observation phase — program ends after last reintroduction

  return { phases, permanentEliminations, startDate, estimatedEndDate }
```

### Eliminated categories for a date
Permanent eliminations always apply. During elimination/reset phase, all protocol categories eliminated. During reintroduction of X, X is allowed but everything not yet reintroduced stays eliminated.

### Conflict detection
```typescript
function detectConflicts(items, eliminatedSlugs): conflicting items where categorySlug is in eliminatedSlugs
```

## Implementation Order

1. `_lib/types.ts` — type definitions
2. `_lib/data.ts` — hardcoded categories, labels, demo meals
3. `_lib/schedule-engine.ts` — pure functions
4. `_lib/CategoryGrid.svelte` — shared component
5. `_lib/EczemaCheck.svelte` — daily assessment component
6. `+layout.svelte` — prototype shell
7. `+page.svelte` — onboarding questionnaire
8. `program/+page.svelte` — unified program page (hero card + timeline)
10. `meal/+page.svelte` — meal logging
11. `day/+page.svelte` — day detail

## Verification

- Run `just dev`, open `https://192.168.0.154/prototype/v2/` on phone
- Complete questionnaire → verify schedule generates correctly
- Navigate between tabs → verify state persists
- Log a meal with eliminated allergen → verify conflict warning appears
- Check day detail → verify schedule + meals + conflicts display correctly
- Verify all touch targets are ≥44px for mobile

---

## Completed: Phase 2 — Full Lifecycle Click-Through

All implemented:
- Date simulation with floating dev panel (`dateOffset` in state, `v2-state-change` custom event)
- Header segment toggle (📅 Program / 📊 Dnes) + ⚙️ settings gear
- Settings page with reset button + answers summary
- Navigation links between all screens (CTAs, tappable banner, success toast with day link)
- Czech language fixes (informal "Moje alergie", "Miminko", formal "jíte/věděla")
- Custom allergen input in CategoryGrid ("Ostatní" replaced with add-custom section, `other:` slug prefix)

---

## Completed: Phase 3 — User Testing Feedback (10/10)

All implemented:
- Soften baby allergy warning text (softer wording with "velmi opatrně" / "s lékařem")
- Sub-item selection in onboarding CategoryGrid (`expandable` mode with sub-item drill-down)
- Daily eczema assessment (`EczemaCheck.svelte` + `DailyAssessment` type, 4 status buttons, notes, photo toggle)
- Fix save button visibility on meal page (fixed positioning with z-30, safe-area padding)
- Tappable schedule timeline → day view (phase cards link to `/prototype/v2/day?date=`)
- Extended date strip for historical browsing (all days from start, green/amber/blue indicator dots)
- Gradual dosing guidance (`getReintroductionDayInfo()` + UI in meal/day pages)
- End-of-program re-test (`appendReTestPhases()` + completion card + dev panel jump-to-end button)
- Adaptive meal CTA per phase type (reintroduction: allergen-specific, other: generic)
- Per-allergen status rows in reintroduction timeline cards (both compact and full views)

---

## Completed: Phase 4 — Evaluation & Polish

All implemented:
- Removed separate evaluation phase — evaluation integrated as end-of-phase event
- End-of-phase evaluation on last day of **reset** (baseline) and **reintroduction** (allergen tolerance)
- 4 evaluation outcomes: tolerated / mild reaction / clear reaction / severe reaction
- `ReintroductionEvaluation` type with outcome, notes, date, phaseId
- Evaluation results + daily assessment summaries shown in program timeline (both compact and full views)
- Evaluation badges (✅🟡🟠🔴) on completed phases in timeline
- Removed observation phase — program ends after last reintroduction
- Demo data generation (`generateDemoData()`) — sample meals, assessments, evaluations for past phases including reset
- Fixed Stredni severity selection bug (colored border/bg only applied when selected)
- Compact program: completed phases expand inline with details, evaluation, and assessment summaries
- Questionnaire step 5: program start date selector
- Vertical centering on short-content screens (questionnaire steps 2, 5; settings)
- Unified single program page — merged hero card (progress + phase + CTA), flat timeline, removed program-full route and dev panel toggle

---

## Completed: Phase 5 — Adverse Reaction Feedback + Timeline UX Overhaul

All implemented:
- Post-evaluation feedback card on adverse reactions (rest days + training phase explanation) in day/+page.svelte
- Colored timeline circles: green (tolerated/improved), amber (mild/unchanged), red (reaction/worsened), gray (no eval)
- Removed right-side eval emoji badges from timeline
- Hero card shows full live details: dietary deviations, skin reactions, allergen status table, evaluation
- Training as inline background band in timeline (left-border accent + label), not separate banner
- Training icon removed (no emoji for now)

---

## Next Steps

### Deferred

| Feedback | Decision | Why |
|----------|----------|-----|
| Phases end/start same day | **Not a bug** — verified no overlap | Visual clarity only, low priority |
