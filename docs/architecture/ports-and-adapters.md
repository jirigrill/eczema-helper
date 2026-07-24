# Ports & Adapters Architecture

## Overview

The app keeps its thinking (pure logic — the schedule and domain rules) strictly separate from its plumbing (anything that touches storage, the DOM, or the framework). Logic never imports the database directly; it talks to small interfaces ("ports"), and the real storage code ("adapters") plugs in behind them. That's the hexagonal / ports-and-adapters split — applied here even with no backend, so the domain stays trivially testable and storage could be swapped without touching the rules. The rest of this doc shows the layers, the current ports, and where reactive reads live.

The Eczema Tracker uses hexagonal (Ports & Adapters) architecture even though it has no backend. The split is between **pure domain logic** and **all I/O**, including local I/O against IndexedDB.

## Why hexagonal here

- **Testability.** Pure domain functions stay free of I/O so they run as plain Vitest unit tests. Dexie adapters are tested against `fake-indexeddb` (loaded globally in `src/test-setup.ts`).
- **Storage swap.** If it ever needs to back up to a server or switch local stores, the domain doesn't move.
- **Boundary discipline.** Forces ourselves to keep `lib/domain/` free of Dexie / DOM / SvelteKit imports.

## Layers

```
┌───────────────────────────────────────────────────────────────┐
│ UI                src/routes/, src/lib/components/            │
│   ↓ reads from stores; calls ports through them               │
├───────────────────────────────────────────────────────────────┤
│ Stores            src/lib/stores/                             │
│   ↓ wrap liveQuery into Svelte stores                         │
├───────────────────────────────────────────────────────────────┤
│ Ports             src/lib/domain/ports/    (interfaces)       │
│ Domain            src/lib/domain/          (pure functions)   │
│   ↑ implemented by                                            │
├───────────────────────────────────────────────────────────────┤
│ Adapters          src/lib/adapters/                           │
│   - dexie-*-repository.ts    (production; tested with         │
│     fake-indexeddb)                                           │
├───────────────────────────────────────────────────────────────┤
│ Infra             src/lib/db/atopic-db.ts (Dexie schema)      │
└───────────────────────────────────────────────────────────────┘
```

## Current ports

All ports return `Result<T, string>` from `$lib/types/result` for expected failures.

### `QuestionnaireRepository` — `src/lib/domain/ports/questionnaire-repository.ts`

```ts
type QuestionnaireRepository = {
  save(answers: QuestionnaireAnswers): Promise<Result<void, string>>;
  load(): Promise<Result<QuestionnaireAnswers | null, string>>;
};
```

Singleton record keyed by `SINGLETON_ID` in the `answers` table.

### `ScheduleRepository` — `src/lib/domain/ports/schedule-repository.ts`

```ts
type ScheduleRepository = {
  save(schedule: GeneratedSchedule): Promise<Result<void, string>>;
  load(): Promise<Result<GeneratedSchedule | null, string>>;
};
```

Singleton record in the `schedule` table.

### `SettingsRepository` — `src/lib/domain/ports/settings-repository.ts`

```ts
type SettingsRepository = {
  save(settings: SettingsData): Promise<Result<void, string>>;
  load(): Promise<Result<SettingsData | null, string>>;
};
```

Singleton record keyed by `SINGLETON_ID` in the `settings` table (issue #567). Holds
the live master switch(es) — `feedingStage` today, room for more — deliberately off
`GeneratedSchedule` so retest/verdict rebuilds cannot overwrite it.

### `SkinObservationRepository` — `src/lib/domain/ports/skin-observation-repository.ts`

```ts
type SkinObservationRepository = {
  save(observation: SkinObservation): Promise<Result<void, string>>;
  listByDate(date: string): Promise<Result<SkinObservation[], string>>;
};
```

List-shaped port. Multiple observations may exist per calendar day. Live reactive reads are handled by `skinObservationSession` in `src/lib/stores/`.

### `SkinPhotoStore` — `src/lib/domain/ports/skin-photo-store.ts`

```ts
type SkinPhotoStore = {
  save(photo: SkinPhoto): Promise<Result<void, string>>;
  listByDate(date: string): Promise<Result<SkinPhoto[], string>>;
};
```

List-shaped port. Multiple photos may exist per calendar day. Live reactive reads are handled by `skinPhotoSession` in `src/lib/stores/`. Photo blobs are stored plaintext (encryption-at-rest tracked in #467).

## Adapters

| Port                          | Adapter                                         |
| ----------------------------- | ----------------------------------------------- |
| `QuestionnaireRepository`     | `dexie-questionnaire-repository.ts`             |
| `ScheduleRepository`          | `dexie-schedule-repository.ts`                  |
| `SettingsRepository`          | `dexie-settings-repository.ts`                  |
| `SkinObservationRepository`   | `dexie-skin-observation-repository.ts`          |
| `SkinPhotoStore`              | `dexie-skin-photo-store.ts`                     |

Each port has a single production adapter. Adapter tests run against `fake-indexeddb` rather than a hand-rolled in-memory fake — see the [decisions log](../decisions-log.md) (was ADR-0013).

Note: `protocolSession.startProtocol` seeds `answers`, `schedule`, and `settings` in one
Dexie `db.transaction` using raw `db.*.put` rather than the repositories — the repo
`save()` methods return `Result` instead of throwing, so they can't abort the
surrounding transaction. Atomic seeding is required (#567) so the settings singleton is
never left behind a committed schedule.

## Stores layer

`liveQuery` belongs **only in stores**, never in ports. Ports expose point reads (`listByDate`, `load`) only. Reactive subscriptions are a UI concern handled in `src/lib/stores/`:

| Store                        | File                                     | What it does                                               |
| ---------------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| `scheduleContext`            | `stores/schedule-context.ts`            | `loading\|empty\|ready\|error` discriminated union for the program |
| `settingsContext`            | `stores/settings-context.ts`            | `readable<SettingsData \| null>` — live master switch(es), e.g. `feedingStage` |
| `mealSession`                | `stores/meal-session.ts`                | `readable<Meal[]>` for today + `save` / `loadBySlot` / `remove` |
| `skinObservationSession`     | `stores/skin-observation-session.ts`    | `readable<SkinObservation[]>` for today + `save`           |
| `skinPhotoSession`           | `stores/skin-photo-session.ts`          | `readable<SkinPhoto[]>` for today + `save`                 |
| `protocolSession`            | `stores/protocol-session.ts`            | Protocol write commands (start, retest, reset, `setFeedingStage`) |

Each session store is the **only** place that imports `db` and constructs the adapter for its domain. Routes import the store; they do not instantiate adapters directly.

## Reactivity boundary

Ports expose **point reads** (`load()`, `listByDate()`), not subscriptions. Live reactive reads are a UI concern and are handled in `src/lib/stores/`, which subscribes directly to `Dexie.liveQuery()`. The `ScheduleContext` store is the canonical example — exposes a `loading | empty | ready` discriminated union to routes.

This is deliberate: putting `liveQuery` in the port would couple the domain to Dexie and force any future test adapter to ship a fake reactive primitive.

## Future ports (not yet authored)

- `MealRepository` — list-shaped; already wired via `mealSession`.
- `AssessmentRepository` — skin observations and photos are wired via `skinObservationSession` / `skinPhotoSession`.
- Backup port — encrypted export/import; not built, tracked in [#438](https://github.com/jirigrill/eczema-helper/issues/438).
