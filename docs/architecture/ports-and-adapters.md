# Ports & Adapters Architecture

The Eczema Tracker uses hexagonal (Ports & Adapters) architecture even though v1 has no backend. The split is between **pure domain logic** and **all I/O**, including local I/O against IndexedDB. See [ADR-0006](../adr/0006-dexie-persistence.md) for the persistence rationale.

## Why hexagonal here

- **Testability.** Pure domain functions stay free of I/O so they run as plain Vitest unit tests. Dexie adapters are tested against `fake-indexeddb` (loaded globally in `src/test-setup.ts`).
- **Storage swap.** If v1.1 ever needs to back up to a server or switch local stores, the domain doesn't move.
- **Boundary discipline.** Forces ourselves to keep `lib/domain/` free of Dexie / DOM / SvelteKit imports.

## Layers

```
┌───────────────────────────────────────────────────────────────┐
│ UI                src/routes/, src/lib/components/            │
│   ↓ reads from stores; calls ports through them               │
├───────────────────────────────────────────────────────────────┤
│ Stores            src/lib/stores/                             │
│   ↓ wrap liveQuery into Svelte stores ([ADR-0009])            │
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

## Current ports (v1)

Both ports return `Result<T, string>` from `$lib/types/result` for expected failures.

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

## Adapters

| Port                       | Adapter                                         |
| -------------------------- | ----------------------------------------------- |
| `QuestionnaireRepository`  | `dexie-questionnaire-repository.ts`             |
| `ScheduleRepository`       | `dexie-schedule-repository.ts`                  |

Each port has a single production adapter. Adapter tests run against `fake-indexeddb` rather than a hand-rolled in-memory fake — see [ADR-0013](../adr/0013-drop-unused-in-memory-adapters.md) for why the in-memory variants were dropped. Both Dexie adapters target the singleton row identified by `SINGLETON_ID` and translate Dexie exceptions into `Result.err(message)`.

## Reactivity boundary

Ports expose **point reads** (`load()`), not subscriptions. Live reactive reads are a UI concern and are handled in `src/lib/stores/`, which subscribes directly to `Dexie.liveQuery()`. The `ScheduleContext` store ([ADR-0009](../adr/0009-schedule-context-store.md)) is the canonical example — exposes a `loading | empty | ready` discriminated union to routes.

This is deliberate: putting `liveQuery` in the port would couple the domain to Dexie and force any future test adapter to ship a fake reactive primitive.

## Future ports (not yet authored)

The slice plan ([ADR-0008](../adr/0008-tracer-bullet-slices.md)) adds:

- `MealRepository` (slice 2) — list-shaped queries; first port that needs a real index.
- `AssessmentRepository` + photo store (slice 3) — adds `assessments` and `photos` Dexie tables. Photo storage stays plaintext in v1 per [ADR-0005](../adr/0005-photo-encryption-deferred.md).
- Backup port (post-alpha) — encrypted export/import per [ADR-0002](../adr/0002-backup-floor.md).

None of these exist yet — add them when their slice lands rather than speculating about their shape now.
