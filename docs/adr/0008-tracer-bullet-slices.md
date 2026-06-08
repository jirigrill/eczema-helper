# 0008 — v1 tracer-bullet slice order

**Status:** Accepted — slices 1–4 landed (onboarding, today, meal,
skin+photo, unified day view) plus the program timeline; v1-alpha is on
the phone. Slices 5–6 (reintro verdict, encrypted export/import) remain
to close out the [v1 scope](0007-v1-scope.md). Completed slices are
recorded at the bottom of this file.
**Date:** 2026-05-11

## Context

The user chose the robust-foundation delivery path: domain-first +
persistence + vertical tracer slices, over screen-by-screen translation.
With the [v1 scope](0007-v1-scope.md) locked at the Protocol Executor,
the question becomes: in what order do the slices ship so that every
slice (a) goes end-to-end through every layer, (b) is usable on a real
phone, (c) proves a pattern the next slice can copy?

## Decision

Slices 1–4 took the app to alpha (recorded under **Completed slices**
at the bottom). Two slices remain to close out the
[v1 scope](0007-v1-scope.md), ordered **risk-first** — the one new
persistence pattern first, then the broadest-blast-radius slice last
once the schema is stable.

### Slice 5 — End-of-reintro allergen verdict

The first new persistence pattern since slice 3: a **record keyed by
phase**, written on an event (the evaluation day) rather than free-form
CRUD. Completes the protocol's reason for existing — recording whether
each reintroduced allergen was tolerated or provoked a reaction.

This slice is larger than "a keyed record + its repository": recording a
*reaction* mutates the schedule, which pulls in the previously-unwired
`insertRestDays`, a widening of `appendReTestPhases`, new `policy.ts`
constants, and a new route. The verdict/status relationship is decided in
[ADR-0016](0016-verdict-drives-schedule-not-status.md): the verdict is an
**audit record** and, on a reaction, drives a schedule mutation; allergen
status stays **topology-derived** (the `evaluations` table does *not* feed
`getAllergenStatuses`).

- Dexie schema **v5**: add an `evaluations` table, keyed
  `'&phaseId, date'` (one immutable row per reintroduction attempt). The
  `ReintroductionEvaluation` model already exists in
  `src/lib/domain/models.ts` and carries no surrogate `id`.
- New `ReintroductionEvaluationRepository` port (`save`,
  `loadByPhase`, `listAll`) + Dexie adapter, following the slice-2/3
  repository shape.
- A **separate, display-only evaluations store** (not folded into
  `scheduleContext`) so the program timeline reads **real** data — today
  it renders a permanently-empty `$state([])`, which this slice removes.
- Write UI on a new **`/evaluation?phase=…&date=…&returnTo=…`** route
  (the `/meal` + `/skin` pattern), reachable from the `/day` phase-hero
  tap and a contextual FAB action gated on `isPhaseEndForEvaluation`.
  Covers both `allergen-test` verdicts (end of reintroduction) and
  `skin-status` verdicts (end of reset/elimination, a pure record). The
  screen renders the "Průběh testu" recap (per-day dose + skin status).
- A reaction inserts a `rest` whose length is severity-keyed
  (`REST_PHASE_DAYS_MILD/_CLEAR/_SEVERE` in `policy.ts`). Protocol
  allergens are **never permanently eliminated**; a reacted allergen is
  eligible for a later **manual** retest via `appendReTestPhases`, widened
  to accept `reacted` protocol allergens (not only `permanent-baby`).
  Verdicts are write-once in v1.
- The verdict ships **without** the "DOPORUČENO" auto-suggestion —
  that depends on the v1.1 pattern-detector per
  [ADR-0007](0007-v1-scope.md).

Done when: the developer reaches an evaluation day, records a verdict
for the allergen, closes and reopens the app, and sees the verdict
reflected on the program timeline.

### Slice 6 — Encrypted export / import

Last because it touches **every** table and adds the crypto round-trip
— the broadest blast radius. Deferred until the schema is stable (i.e.
after `evaluations` lands in slice 5) so the export format needs no
follow-up migration.

- New serialization service: read all tables (`answers`, `schedule`,
  `meals`, `skin_observations`, `photos`, `evaluations`) into one
  snapshot object; photo Blobs base64-encoded into the snapshot.
- Encrypt the snapshot with the existing `encrypt()` helper in
  `src/lib/crypto/` (AES-256-GCM + PBKDF2-derived key from a passphrase)
  and offer it as a downloadable backup file
  ([ADR-0002](0002-backup-floor.md)). No new crypto primitives — the
  helpers are already written and tested, just unconsumed.
- Import: file picker → passphrase → `decrypt()` → validate the
  snapshot shape → bulk-write into Dexie (clear-then-restore).
- Settings UI gains a passphrase prompt, an export (download) button,
  and an import (file + passphrase) button alongside the existing reset.

Done when: the developer exports an encrypted backup, resets the app,
imports the file with the passphrase, and sees the full protocol state
restored.

## Why this order

- **(4) first** (now shipped) because it introduced no new table and no
  new persistence pattern — it reused slices 1–3's repository reads and
  write screens, parameterized by date, leaning on the already-extracted
  pure `buildScheduleContext()`. Lowest risk, and immediately useful:
  the dogfooding mother can backfill the days she forgot to log.
- **(5) next** because it is the one remaining slice that adds a new
  persistence pattern (event-written, phase-keyed record) and it
  completes the elimination protocol's core question. It builds on the
  port/adapter shape the earlier slices proved.
- **(6) last** because it reads and writes every table and carries the
  crypto round-trip — the widest surface to get wrong. Running it after
  `evaluations` exists means the backup format is authored once against
  the final schema, with no migration to chase.

These slices reuse slices 1–3's shapes; only slice 5 adds a genuinely
new pattern, and it is a small one (a keyed record + its repository).

## Backlog (post-v1)

### Deferred from slice 2

Items explicitly out of scope for slice 2 (#121) that belong in the
post-alpha backlog:

- **Recents strip** ("Naposledy") on the meal-add screen — requires
  querying meal history across dates; deferred until the Dexie `meals`
  table has enough data to be useful.
- **Sub-item search** — full text search across the sub-item catalogue
  with status pills and a custom-item fallback; deferred to avoid
  complexity before the catalogue shape is stable.

Both are self-contained UI additions with no new persistence patterns;
they drop into the meal-add screen without touching other layers.

## Consequences

- Issues for the remaining slices 4–6 can be authored with the
  `to-issues` skill using this ADR as the brief.
- The domain layer in `src/lib/domain/` is consumed but not redesigned
  during these slices — the existing pure functions (`generateSchedule`,
  `getEliminatedSlugsForDate`, `detectConflicts`,
  `getReintroductionDayInfo`, `buildScheduleContext`) are the v1 domain.
  Slice 5 adds the one new persistence pattern (the `evaluations` table
  + its repository); slices 4 (shipped) and 6 add no new tables.
- The `photoTaken: boolean` / `dateOffset` / `activeScenario` cleanups
  noted for slices 1–3 have already landed (real `photos` table; no
  developer affordances on `AppState`).

## Completed slices

Recorded here after shipping; each went end-to-end through every layer
and is installed on the developer's phone.

### Slice 1 — Onboarding + Today (read-only) ✅

The smallest slice that exercises every layer once. Singleton-only
persistence, no list queries yet.

- Dexie schema v1 with `answers` and `schedule` singletons.
- Domain ports for onboarding and schedule retrieval; Dexie adapters.
- Onboarding screen writes `answers`, invokes `generateSchedule()`,
  persists `schedule`.
- Today screen reads `schedule` via `Dexie.liveQuery()`, computes
  "what's eliminated today" via `getEliminatedSlugsForDate()`, renders.
- Installable as a PWA over LAN (`bun run dev --host`).

### Slice 2 — Log a meal → see it on today ✅

The canonical CRUD loop. Proved reactive list queries and conflict
detection in the UI.

- Added `meals` table to Dexie schema (version bump with upgrade).
- Meal repository port + Dexie adapter.
- Meal-add screen with mealType pills, item selection from categories,
  conflict flagging against today's elimination set.
- Today screen reads today's meals via `liveQuery` and renders the list.

(Recents strip + sub-item search were carved out of this slice — see
**Backlog** above.)

### Slice 3 — Daily skin assessment + photo ✅

De-risked the binary path before more screens accumulated.

- Added `skin_observations` and `photos` tables to Dexie schema.
- `SkinObservation` repository, `SkinPhoto` store.
- `/skin` screen: status picker, optional notes. Photos captured
  independently and stored as Blobs in the `photos` table, plaintext
  per [ADR-0005](0005-photo-encryption-deferred.md). Both records are
  linked by `date` only — no FK; multiple of each may exist per day.
- Today screen surfaces today's skin observations (list) and photos
  (thumbnail grid) in two separate cards.
- Today screen wires `getToleranceBuildingRemindersForDate()` from
  `src/lib/domain/schedule-builder.ts`.

### Slice 4 — Unified day view (any date, editable) ✅

Introduced **no new tables and no new persistence pattern** — it
composes existing repositories at an arbitrary date, proving the
"parameterized-by-date read" shape (vs. the today-bound `liveQuery`
of slices 1–3). Not read-only: any day in range is backfill- and
edit-able to today's parity, since the breastfeeding mother often
remembers a meal or skin status only the next day.

- **One route `/day/[date]`** renders the day layout for any date and
  **replaced `/today`** (deleted, not redirected). The root
  post-onboarding redirect, the nav "Dnes" tab, and the `returnTo`
  defaults all retarget to `/day/<todayIso>`. Reads that date's meals,
  skin observations, and photos through the existing repositories.
- **Reactive, not a snapshot.** The day's records read through
  date-scoped `liveQuery` subscriptions — the session stores became
  **factories** (`createMealSession(date)` etc.) so `liveQuery` stays in
  the stores layer per [ADR-0009](0009-schedulecontext-store.md).
  `scheduleContext` keeps its singleton `liveQuery`; the date-dependent
  projection is a page-side `$derived` over the pure
  `buildScheduleContext(raw, selectedDate)`. The day composition lives
  in the `createDayView` deep module (`day-view.svelte.ts`, #200).
- **Navigation:** a sliding-window 7-day strip clamped to
  **[protocol start, today]**; out-of-range or malformed `[date]`
  redirects to today.
- **Edit scope = parity-with-today.** Meals editable on any day via
  slot-overwrite (meal screen parameterized by `?date=`). Skin
  observations and photos add-only.
- **Action-prompt chrome is today-only** — tolerance reminders and the
  task counter gated on `selectedDate === today`; past days show only
  historical facts plus the add affordance.
- **FAB wired** to the skin/meal/photo action sheet, each routing to its
  add screen with `?date=<selected>&returnTo=/day/<selected>`.

### Program timeline ✅

Shipped alongside the slices above (not numbered separately): the
`/program` phase timeline with progress, permanent eliminations, and
retest add/cancel (`appendReTestPhases()` / `removeReTestPhase()`). It
renders an `evaluations` array that slice 5 will populate.

### Original slice order rationale (slices 1–3)

- **(1) first** because every other slice depends on a `schedule`
  being present. Stubbing it in code would leak through conflict
  detection and the today view, then get torn out.
- **(2) second** because list-shaped CRUD is where 80% of the daily
  loop lives. Proving the reactive `liveQuery` → store → screen pattern
  on a real list query makes every subsequent screen a copy.
- **(3) third** because the photo path has its own risk surface (Blob
  in IndexedDB, camera on iOS Safari PWA, future encryption hook). It
  belongs in v1 but should not be where the architecture is first
  proven.
