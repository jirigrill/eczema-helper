# 0006 — Dexie/IndexedDB with normalized tables

**Status:** Accepted (extended by ADR-0023 / ADR-0025 / ADR-0026 — new v1.1 tables)
**Date:** 2026-05-11

> **Extension (v1.1 program engine, 2026-07-05):** the normalized-table decision
> extends without conflict to the program-engine tables — `events`
> ([ADR-0025](0025-event-domain-model.md)), `proposals` (write-only audit,
> [ADR-0026](0026-llm-schedule-proposer.md)), and a **ladder-override** table
> ([ADR-0023](0023-dose-escalation-ladder.md)). Same `version().stores()` pattern,
> same `liveQuery` reactivity, each added to the ADR-0002 export snapshot. The
> `proposals` table is append-only and **never read by any schedule derivation**
> (topology stays the truth), so it does not reopen the event-log question (§ "Why
> not the event log").

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
  `lib/domain/`. The domain stays pure; adapters are tested against
  `fake-indexeddb` (see [ADR-0013](0013-drop-unused-in-memory-adapters.md)).
- Schema migrations use Dexie's declarative `version().stores()` chain.
  Data migrations (row-shape changes) use `upgrade()` callbacks.
- Every persisted record carries a locally-generated UUID, satisfying
  ADR-0002 and leaving the door open for a future sync layer without
  ID coordination.
- The insight engine never touches Dexie. It receives plain arrays and
  returns `Insight[]`. This keeps it trivial to test.

## Known gotcha — liveQuery transient-empty on unrelated writes

`Dexie.liveQuery()` tracks which tables a query touches during its first
run. A write to a *previously-unread* table (e.g. `photos`) can bump the
internal version counter and cause a re-run that briefly returns stale or
empty results.

**Pattern:** any store that is backed by a `liveQuery` and has a meaningful
`ready` state must guard against this. When the query fires empty while the
store is already `ready`, re-query Dexie once before transitioning away:

```ts
if (!row && currentStatus === 'ready') {
  void db.myTable.get(id).then((r) => {
    if (!r) { currentStatus = 'empty'; set({ status: 'empty' }); }
  });
  return; // don't transition yet
}
```

This guard is implemented in `src/lib/stores/schedule-context.ts` and
covered by the `transient-empty` test in the colocated `.test.ts` file.
