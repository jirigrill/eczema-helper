# Ports & Adapters Architecture

## Overview

The app keeps its thinking (pure logic — the food catalog and domain rules) strictly separate from its plumbing (anything that touches storage, the DOM, or the framework). Logic never imports the database directly; it talks to small interfaces ("ports"), and the real storage code ("adapters") plugs in behind them. That's the hexagonal / ports-and-adapters split — applied here even with no backend, so the domain stays trivially testable and storage could be swapped without touching the rules. The rest of this doc shows the layers, the current ports, and where reactive reads live.

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

### `SettingsRepository` — `src/lib/domain/ports/settings-repository.ts`

```ts
type SettingsRepository = {
  save(settings: SettingsData): Promise<Result<void, string>>;
  load(): Promise<Result<SettingsData | null, string>>;
};
```

Singleton record keyed by `SINGLETON_ID` in the `settings` table (issue #567). Holds
the live master switch(es) — `feedingStage` today, room for more. Since the descaling
(PRD #623) it is also the app's *seeded* signal: `settings.feedingStage != null` gates
first-run redirect.

### `MealRepository` — `src/lib/domain/ports/meal-repository.ts`

```ts
type MealRepository = {
  save(meal: Meal): Promise<Result<void, string>>;
  loadBySlot(date: string, mealType: MealType, actor: Actor): Promise<Result<Meal | null, string>>;
  listByDate(date: string): Promise<Result<Meal[], string>>;
  remove(date: string, mealType: MealType, actor: Actor): Promise<Result<void, string>>;
  earliestLoggedDate(): Promise<Result<string | null, string>>;
};
```

`earliestLoggedDate` (PRD #623 §3a) is an index-ordered first-key lookup — `null` when
nothing is logged — feeding the day strip's `earliest logged day … today` range. Live
reactive reads for today are handled by `mealSession` in `src/lib/stores/`.

### `SkinObservationRepository` — `src/lib/domain/ports/skin-observation-repository.ts`

```ts
type SkinObservationRepository = {
  save(observation: SkinObservation): Promise<Result<void, string>>;
  listByDate(date: string): Promise<Result<SkinObservation[], string>>;
  earliestLoggedDate(): Promise<Result<string | null, string>>;
};
```

List-shaped port. Multiple observations may exist per calendar day. `earliestLoggedDate`
(PRD #623 §3a) mirrors the meal port's method; the day view unions the two. Live reactive reads are handled by `skinObservationSession` in `src/lib/stores/`.

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
| `SettingsRepository`          | `dexie-settings-repository.ts`                  |
| `MealRepository`              | `dexie-meal-repository.ts`                      |
| `SkinObservationRepository`   | `dexie-skin-observation-repository.ts`          |
| `SkinPhotoStore`              | `dexie-skin-photo-store.ts`                     |

Each port has a single production adapter. Adapter tests run against `fake-indexeddb` rather than a hand-rolled in-memory fake — see the [decisions log](../decisions-log.md) (was ADR-0013).

## Stores layer

`liveQuery` belongs **only in stores**, never in ports. Ports expose point reads (`listByDate`, `load`) only. Reactive subscriptions are a UI concern handled in `src/lib/stores/`:

| Store                        | File                                     | What it does                                               |
| ---------------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| `settingsContext`            | `stores/settings-context.ts`            | `readable<SettingsState>` — `loading\|unset\|seeded` discriminated union over the live master switch(es), e.g. `feedingStage` |
| `settingsStore`              | `stores/settings.svelte.ts`             | Live feeding-stage + status read (over `settingsContext`) + `setFeedingStage` write |
| `mealSession`                | `stores/meal-session.ts`                | `readable<Meal[]>` for today + `save` / `loadBySlot` / `remove` |
| `skinObservationSession`     | `stores/skin-observation-session.ts`    | `readable<SkinObservation[]>` for today + `save`           |
| `skinPhotoSession`           | `stores/skin-photo-session.ts`          | `readable<SkinPhoto[]>` for today + `save`                 |
| `earliestLogged`             | `stores/earliest-logged.ts`             | `readable<string \| null>` — earliest logged day across all meals + skin observations (§3a); app-wide singleton |

### Factory vs. singleton

A store is a **date-scoped factory** (`create*(date)`) iff its value is scoped to a parameter — typically a date. Otherwise it is an **app-wide singleton** (`export const`), constructed once at module scope.

- **Factories:** `createMealSession(date)`, `createSkinObservationSession(date)`, `createSkinPhotoSession(date)`, `createDayView(...)`, `createMealEditor()` — each call yields a store bound to its argument.
- **Singletons:** `settingsContext`, `settingsStore`, `harvestCandidateSession`, `earliestLogged`, `discardBuffer`, `dayStripRecentreSignal` — one instance, one subscription, shared by every consumer.

Two stores keep a factory *and* export a fixed module-scope instance of it: `mealSession` and `skinObservationSession` are `create*(todayIso())` bound once, for mutation call sites (copy-undo, delete/copy) that act outside any one date's subscription. That is not an exception to the rule — the factory is still the date-scoped shape, and the shared instance is a singleton use of it; both are recorded where they live.

`earliestLogged` is the case the rule was written to settle: it looks like it could be a factory, but its value is global (the earliest day across *all* entries, not any one date), so it is a singleton. Both consumers — the day-view store and the meal route — import the one `export const` and share its single `liveQuery` subscription rather than each starting its own. A module-scope `readable` ref-counts its start/stop notifier, so the subscription runs while ≥1 consumer is mounted and tears down when the last unmounts; there is no app-lifetime leak and no separate effect root is required (the day view's `fromStore(...)` wrapper is owned by its component's lifecycle).

If a future store's value is global but a factory shape is genuinely required, keep the factory and record the reason here rather than leaving the next author to guess.

Each session store is the **only** place that constructs the adapter for its domain, and holds it as one module-scope instance — `mealRepository` in `stores/meal-session.ts`, `skinObservationRepository` in `stores/skin-observation-session.ts`, and the private equivalents in the settings and harvest-candidate stores. Anything else needing that domain's adapter imports the instance; nobody writes a second `new DexieXRepository(db)`. That single instance per domain is the seam a storage swap turns on, so scattering constructors quietly removes the reason the architecture exists.

Cross-domain readers follow the same rule by importing from each owning store — `stores/earliest-logged.ts` unions the meal and skin-observation ports that way rather than constructing either.

Routes import the store, not the adapter.

**Database lifecycle sits outside this rule.** `db/reset-database.ts` clears every table for the Settings factory reset. No domain owns a whole-database wipe, so it lives beside `atopic-db.ts` and reads `db.tables` rather than naming tables — a hand-written list is what previously let the reset spare the mother's meals, observations and photos while the UI promised to erase them.

## Reactivity boundary

Ports expose **point reads** (`load()`, `listByDate()`), not subscriptions. Live reactive reads are a UI concern and are handled in `src/lib/stores/`, which subscribes directly to `Dexie.liveQuery()`. The `settingsContext` store is a representative example — a `readable` over the settings singleton that re-emits on every change.

This is deliberate: putting `liveQuery` in the port would couple the domain to Dexie and force any future test adapter to ship a fake reactive primitive.

## Future ports (not yet authored)

- Backup port — encrypted export/import; not built, tracked in [#438](https://github.com/jirigrill/eczema-helper/issues/438).
