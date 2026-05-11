# 0006 — Dexie/IndexedDB with normalized tables

**Status:** Accepted
**Date:** 2026-05-11

## Context

The app needs client-side persistence in a PWA — no server, per
[ADR-0001](0001-single-device-v1.md). The current prototype keeps the
whole `AppState` as one JSON blob in `localStorage`. That breaks the
moment we add photos (localStorage cap ~5MB, one photo blows it) and
gives us no query layer for the insight engine in
[ADR-0004](0004-causation-derived-not-recorded.md).

Three shapes were considered for the IndexedDB layout:

- **(a)** One Dexie record holding the whole state as JSON, plus a
  separate `photos` table for binary payloads.
- **(b)** Normalized tables — one per entity (`meals`, `assessments`,
  `evaluations`, `photos`, plus singletons for `answers` / `schedule`).
- **(c)** Append-only event log; state as a projection. Full
  auditability and undo for free.

## Decision

Dexie on top of IndexedDB, with **normalized tables** (option b):

```
db.version(1).stores({
  meals:       '&id, date, mealType',
  assessments: '&id, date',
  evaluations: '&id, phaseId, date',
  photos:      '&id, assessmentId, createdAt',
  answers:     '&id',
  schedule:    '&id',
})
```

Reactive UI bindings use `Dexie.liveQuery()` to feed Svelte 5 stores.

## Why normalized tables

- **Photos force it.** Photos are binary blobs that must live in their
  own table for lazy loading. Once one part of state is normalized,
  "one blob for the rest" becomes a smell.
- **Write atomicity.** Logging a meal should not read-modify-write the
  entire state object. That is a footgun with concurrent tabs and a
  performance question once photos exist.
- **Insight engine.** The pattern detector (ADR-0004) is a pure function
  over arrays of meals and assessments. Per-table queries hand it the
  rows it needs without loading the whole world.
- **Export remains trivial.** The encrypted backup blob from
  [ADR-0002](0002-backup-floor.md) is built by iterating each table and
  serialising to JSON. Restore reverses the operation. The blob format
  is the documented contract.

## Why not the event log (c)

Single-user, single-device, ~500 records over a ~90-day protocol. We
have no audit requirement, no sync, and no undo-as-a-feature. Event
sourcing earns its keep against those problems; we do not have them.

## Consequences

- `lib/adapters/` will host concrete Dexie implementations
  (`DexieMealRepository`, `DexiePhotoStore`, etc.) of ports defined in
  `lib/domain/`. The domain stays pure and testable with in-memory
  fakes.
- Schema migrations use Dexie's declarative `version().stores()` chain.
  Data migrations (row-shape changes) use `upgrade()` callbacks.
- Every persisted record carries a locally-generated UUID, satisfying
  ADR-0002 and leaving the door open for a future sync layer without
  ID coordination.
- The insight engine never touches Dexie. It receives plain arrays and
  returns `Insight[]`. This keeps it trivial to test.
