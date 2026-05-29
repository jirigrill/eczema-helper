# 0008 — v1 tracer-bullet slice order

**Status:** Accepted — slice 1 landed (onboarding + today on Dexie `answers`/`schedule`); slices 2–3 still ahead.
**Date:** 2026-05-11

## Context

The user chose the robust-foundation delivery path: domain-first +
persistence + vertical tracer slices, over screen-by-screen translation.
With the [v1 scope](0007-v1-scope.md) locked at the Protocol Executor,
the question becomes: in what order do the slices ship so that every
slice (a) goes end-to-end through every layer, (b) is usable on a real
phone, (c) proves a pattern the next slice can copy?

## Decision

Three slices to alpha, in order:

### Slice 1 — Onboarding + Today (read-only)

The smallest slice that exercises every layer once. Singleton-only
persistence, no list queries yet.

- Dexie schema v1 with `answers` and `schedule` singletons (other
  tables added in later slices).
- Domain ports for onboarding and schedule retrieval; Dexie adapters
  implementing them.
- Onboarding screen writes `answers`, invokes the existing
  `generateSchedule()` from `src/lib/domain/schedule.ts`, persists
  `schedule`.
- Today screen reads `schedule` via `Dexie.liveQuery()`, computes
  "what's eliminated today" via the existing
  `getEliminatedSlugsForDate()`, renders.
- Installable as a PWA on the developer's phone over LAN
  (`bun run dev --host`).

Done when: the developer can open the installed PWA on their phone,
complete onboarding, and see today's phase + eliminated allergens.

### Slice 2 — Log a meal → see it on today

The canonical CRUD loop. Proves reactive list queries and conflict
detection in the UI.

- Add `meals` table to Dexie schema (version bump with upgrade).
- Meal repository port + Dexie adapter.
- Meal-add screen with mealType pills, item selection from categories,
  conflict flagging against today's elimination set.
- Today screen now also reads today's meals via `liveQuery` and renders
  the meal list.

Done when: the developer can log a breakfast on their phone and watch
it appear on today, with allergen conflicts flagged.

### Slice 3 — Daily skin assessment + photo

De-risks the binary path before more screens accumulate.

- Add `skin_observations` and `photos` tables to Dexie schema.
- `SkinObservation` repository, `SkinPhoto` store.
- `/skin` screen: status picker, optional notes. Photos captured
  independently via FAB → "Přidat fotku" and stored as Blobs in the
  `photos` table, plaintext per [ADR-0005](0005-photo-encryption-deferred.md).
  Both are independent records linked by `date` only — no FK between them.
  Multiple `SkinObservation` and `SkinPhoto` records may exist per day.
- Today screen surfaces today's skin observations (list) and photos (thumbnail grid) in two separate cards.
- Today screen wires `getToleranceBuildingRemindersForDate()` from
  `src/lib/domain/schedule-builder.ts` — training reminders were in
  the [v1 scope](0007-v1-scope.md) but not assigned to any earlier
  slice.

Done when: the developer can log a daily skin status with a photo on
their phone, close the app, reopen, and see it persisted — and any
active training reminders are visible on the today screen.

## Why this order

- **(1) first** because every other slice depends on a `schedule`
  being present. Stubbing the schedule in code would leak through
  conflict detection and the today view, then get torn out.
- **(2) second** because list-shaped CRUD is where 80% of the daily
  loop lives. Proving the reactive `liveQuery` → Svelte store → screen
  pattern on a real list query makes every subsequent screen a copy.
- **(3) third** because the photo path has its own risk surface (Blob
  in IndexedDB, camera on iOS Safari PWA, future encryption hook). It
  belongs in v1 but should not be where the architecture is first
  proven.

## After slice 3 — v1-alpha

The app is usable on the phone for daily logging through the
elimination protocol. The remaining v1 work follows the same slice
pattern:

- Day-detail screen (read-only review of a past day).
- Program timeline screen.
- End-of-reintro allergen verdict flow.
- Encrypted export/import per
  [ADR-0002](0002-backup-floor.md).

Each is its own slice. None of them introduce new architectural
patterns — they reuse slices 1–3's shapes.

### Deferred from slice 2 (pick up post-slice-3)

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

- Issues for slices 1–3 can be authored with the `to-issues` skill
  using this ADR as the brief.
- The domain layer in `src/lib/domain/` is consumed but not redesigned
  during these slices — the existing pure functions (`generateSchedule`,
  `getEliminatedSlugsForDate`, `detectConflicts`,
  `getReintroductionDayInfo`) are the v1 domain. Cleanups (e.g.
  removing the `dateOffset` / `activeScenario` developer affordances
  from `AppState`, replacing `photoTaken: boolean` with a real photo
  reference) happen *during* the slice that touches them.
