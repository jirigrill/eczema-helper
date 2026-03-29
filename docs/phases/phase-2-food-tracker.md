# Phase 2: Food Elimination Tracker

> **Note: This phase is split into two sub-phases for manageable scope.**
>
> - **Phase 2a**: Calendar + food elimination tracking + server API (core functionality)
> - **Phase 2b**: Meal logging + copy-from-yesterday + offline sync (enhancements)
>
> Phase 2a is sufficient for a usable elimination tracker. Phase 2b adds meal logging, convenience features, and offline-first sync.

## Summary

This phase builds the core feature of the application: the food elimination tracker. It implements a swipeable calendar component with month-view navigation, a day detail view showing food elimination status, a food category grid with emoji icons and expandable sub-items, toggle functionality for eliminating and reintroducing foods, a "copy from yesterday" shortcut, coloured dots on calendar days indicating active eliminations, full offline support via Dexie.js with background sync to the server, and the server-side API routes for food log CRUD operations. After this phase, the app is functionally useful for tracking an elimination diet.

### Phase 2a Scope (Calendar + Elimination Tracking)

Features 1-8, 11: Calendar component, month navigation, day detail view, food category grid, sub-item expansion, toggle functionality, coloured dots, server API for food logs.

### Phase 2b Scope (Meals + Offline Sync)

Features 7, 9-10, 12-15: "Copy from yesterday" shortcut, offline-first Dexie.js persistence, background sync engine, meal logging interface, meal composer, meal server API, meal display in day detail.

## Prerequisites

Phase 0 and Phase 1 must be complete. Specifically:

- The app shell with bottom tab navigation is functional.
- User authentication and cookie-based sessions are working.
- Child management is operational (users have at least one child).
- Food categories and items are seeded in PostgreSQL.
- The Dexie.js local database schema is set up.
- The `children` store (Svelte 5 runes in `children.svelte.ts`) with `getSelectedChild()` is functional.
- `docs/architecture/ui-design.md` exists with UX decisions (from Phase 1).

### UI Decisions — Deferred to User Testing

These decisions are deferred to user testing during Phase 1 (when the app shell runs on a real phone). The architecture is UI-agnostic — domain services, ports, and adapters do not depend on the UI approach, so multiple patterns can be prototyped without changing business logic.

1. **Day detail view**: ~~Navigate to a new page (`/calendar/[date]`) vs open a bottom sheet over the calendar.~~ **Resolved:** Use a **bottom sheet** for the day detail view. This keeps the calendar visible for context (the user can see neighboring days) and matches iOS native patterns. The sheet should be draggable to:
   - **Half-height:** Food status overview (category icons with elimination badges)
   - **Full-height:** Full food grid + meal log tabs

   Tab layout within the sheet: "Eliminace" | "Jídla" (Eliminations | Meals).

2. **Meal composer**: Inline expandable section vs separate route (`/meals/new?date=...`). Candidates:
   - **Inline**: faster for quick logging, fewer navigations.
   - **Separate route**: more screen space for the searchable food picker.
   - Decision recorded in `ui-design.md` after testing.

3. **Food category grid + meal list layout**: Candidates:
   - **Tabs** ("Eliminace" / "Jidla"): clean separation, one concern visible at a time.
   - **Vertical scroll with sections**: see everything at once, more scrolling.
   - **Collapsible accordions**: compact, each section expandable.
   - Decision recorded in `ui-design.md` after testing.

## Features

1. Build a calendar component with month view displaying a 7-column grid of days.
2. Implement month navigation (previous/next month) with swipe gesture support on mobile.
3. Create a day detail view that shows the food elimination status for a selected day.
4. Build a food category grid displaying categories as emoji icon tiles.
5. Implement expandable sub-items within each food category (tap to expand/collapse).
6. Implement toggle functionality to mark a food item as eliminated or reintroduced.
7. Build a "Copy from yesterday" shortcut button that duplicates the previous day's elimination state.
8. Render coloured dots on calendar days indicating how many active eliminations exist for that day.
9. Implement offline-first data persistence using Dexie.js with optimistic UI updates.
10. Implement background sync that pushes unsynced Dexie.js records to the server when connectivity is restored.
11. Build server API routes for food log CRUD: `GET`, `POST`, `PUT`, `DELETE` on `/api/food-logs`.
12. Build a meal logging interface where the mother can record what she ate (e.g., "breakfast: pork, potato, baked milk") by composing meals from food sub-items and free-text entries.
13. Build a meal composer UI with meal type selector (breakfast/lunch/dinner/snack), food item picker (from predefined sub-items + free text input), and optional meal label.
14. Build server API routes for meal CRUD: `GET`, `POST`, `PUT`, `DELETE` on `/api/meals`.
15. Display logged meals in the day detail view alongside the elimination tracker.
16. **Configure Workbox runtime caching strategies** in `vite.config.ts` per `docs/architecture/offline-strategy.md`: NetworkFirst for `/api/*`, CacheFirst with 30-day expiry for static assets.
17. **Build a sync status indicator UI** — cloud icon in app header showing sync state: green (synced), orange (syncing), grey with slash (offline). Toast on sync completion.
18. **Implement push-first sync ordering** — local changes pushed before pulling server changes to prevent overwriting local edits with stale server state.
19. **Implement conflict resolution (last-write-wins)** — use server-side `updated_at` for conflict resolution. Add unique constraint `(child_id, date, category_id, action)` on `food_logs` to prevent duplicates.
20. **Set up Dexie.js schema versioning** — implement `.upgrade(tx => ...)` hooks for data transformation. After schema upgrade, trigger full re-sync.

## Acceptance Criteria

- [ ] **AC-1 (Feature 1):** The calendar page renders a grid with the current month's days. The grid has 7 columns (Mon-Sun or Sun-Sat based on locale). Days from the previous and next months that fill incomplete weeks are shown in a muted style. The current day is visually highlighted.
- [ ] **AC-2 (Feature 2):** Tapping a left arrow navigates to the previous month. Tapping a right arrow navigates to the next month. On a touch device, swiping left shows the next month and swiping right shows the previous month. The month and year header updates accordingly.
- [ ] **AC-3 (Feature 3):** Tapping a day on the calendar opens a day detail view (either a new route or a slide-up panel) showing the selected date and a summary of food elimination status for that day.
- [ ] **AC-4 (Feature 4):** The food category grid displays all 12 seeded categories as tiles with their emoji icon and Czech name. The grid adapts to the viewport width (3 columns on 375px, 4 columns on wider screens).
- [ ] **AC-5 (Feature 5):** Tapping a food category tile expands it to reveal its sub-items as a list or secondary grid. Tapping it again collapses the sub-items. Only one category is expanded at a time (accordion behaviour).
- [ ] **AC-6 (Feature 6):** Tapping a food sub-item toggles its status for the selected day. The toggle cycles: neutral (no log) -> eliminated (red/crossed out) -> reintroduced (green/checkmark) -> neutral. The visual state updates immediately without waiting for a server response.
- [ ] **AC-7 (Feature 7):** A "Copy from yesterday" button is visible on the day detail view. Tapping it copies all elimination entries from the previous calendar day to the currently selected day. If the current day already has entries, a confirmation dialog asks whether to overwrite or merge. If yesterday has no entries, the button is disabled or shows a tooltip.
- [ ] **AC-8 (Feature 8):** Calendar day cells display coloured dots below the day number. The dot colour varies by number of active eliminations: 0 = no dot, 1-3 = yellow dot, 4-6 = orange dot, 7+ = red dot. The dots are visible at a glance without tapping the day.
- [ ] **AC-9 (Feature 9):** All food log mutations (create, update, delete) are immediately written to Dexie.js. The UI reflects the change instantly. The `syncedAt` field is `null` for records that have not been pushed to the server.
- [ ] **AC-10 (Feature 10):** When the device comes online (detected via `navigator.onLine` or the `online` event), a background sync process finds all Dexie.js food log records where `syncedAt` is `null` and pushes them to the server API. On success, `syncedAt` is set to the current timestamp. On failure, records remain unsynced and retry on the next online event.
- [ ] **AC-11 (Feature 11):** `GET /api/food-logs?childId=X&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` returns all food log entries for the given child and date range with status 200. `POST /api/food-logs` creates a new entry and returns 201. `PUT /api/food-logs/[id]` updates an entry and returns 200. `DELETE /api/food-logs/[id]` removes an entry and returns 204. All routes require authentication and verify child ownership.
- [ ] **AC-12 (Feature 12):** The day detail view has a "Meals" section below the elimination tracker. The mother can add a meal by selecting a meal type (breakfast/lunch/dinner/snack) and adding food items from predefined sub-items or typing free-text entries.
- [ ] **AC-13 (Feature 13):** The meal composer shows a meal type selector (buttons or dropdown for snidane/obed/vecere/svacina), a searchable food item picker that filters predefined `FoodSubItem` entries as the user types, a free-text input for items not in the list, and an optional meal label field. Adding an item shows it as a chip/tag that can be removed.
- [ ] **AC-14 (Feature 14):** `GET /api/meals?date=YYYY-MM-DD` returns all meals with their items for the authenticated user and date with status 200. `POST /api/meals` creates a new meal with items and returns 201. `PUT /api/meals/[id]` updates a meal and returns 200. `DELETE /api/meals/[id]` removes a meal and its items (cascade) and returns 204. All routes require authentication; meals belong to the logged-in user.
- [ ] **AC-15 (Feature 15):** The day detail view shows a list of logged meals for the selected day, each displaying the meal type label, optional custom label, and a comma-separated list of food items (using Czech names for predefined items, custom names for free-text items).

## Implementation Details

### Files Created / Modified

| File                                                     | Description                                                                   |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/lib/components/calendar/CalendarGrid.svelte`        | Month view grid component with day cells                                      |
| `src/lib/components/calendar/CalendarHeader.svelte`      | Month/year display with previous/next navigation arrows                       |
| `src/lib/components/calendar/DayCell.svelte`             | Individual day cell with number, status dot, and tap handler                  |
| `src/lib/components/calendar/SwipeContainer.svelte`      | Touch gesture wrapper for month swiping                                       |
| `src/lib/components/food/FoodCategoryGrid.svelte`        | Grid of food category tiles with emoji icons                                  |
| `src/lib/components/food/FoodCategoryTile.svelte`        | Single category tile (emoji, name, expanded state)                            |
| `src/lib/components/food/FoodSubItemList.svelte`         | Expandable list of sub-items within a category                                |
| `src/lib/components/food/FoodSubItemToggle.svelte`       | Individual food sub-item with toggle status (neutral/eliminated/reintroduced) |
| `src/lib/components/food/CopyFromYesterdayButton.svelte` | "Copy from yesterday" action button                                           |
| `src/routes/(app)/calendar/+page.svelte`                 | Calendar page assembling all calendar components                              |
| `src/routes/(app)/calendar/+page.server.ts`              | Server load function fetching food logs for the current month                 |
| `src/routes/(app)/calendar/[date]/+page.svelte`          | Day detail view for a specific date                                           |
| `src/routes/(app)/calendar/[date]/+page.server.ts`       | Server load function for a specific day's data                                |
| `src/routes/(app)/food/+page.svelte`                     | Food management page (alternative entry to the food grid)                     |
| `src/routes/api/food-logs/+server.ts`                    | GET (list) and POST (create) food log endpoints                               |
| `src/routes/api/food-logs/[id]/+server.ts`               | PUT (update) and DELETE (remove) food log endpoints                           |
| `src/lib/domain/services/food-tracking.ts`               | Pure domain logic for food tracking (toggle, copy, active eliminations)       |
| `src/lib/stores/food-log.ts`                             | Rewritten food log store with Dexie.js integration and sync logic             |
| `src/lib/stores/calendar.ts`                             | Calendar navigation state (current month, selected date)                      |
| `src/lib/adapters/dexie-db.ts`                           | Updated with food log and meal sync methods                                   |
| `src/lib/adapters/sync.ts`                               | Background sync engine for pushing unsynced records to server                 |
| `src/lib/components/food/MealComposer.svelte`            | Meal creation form: meal type selector, food item picker, free text input     |
| `src/lib/components/food/MealItemPicker.svelte`          | Searchable food sub-item picker with autocomplete + free text fallback        |
| `src/lib/components/food/MealCard.svelte`                | Display component for a logged meal (type, label, items list)                 |
| `src/lib/components/food/MealList.svelte`                | List of logged meals for a given day                                          |
| `src/lib/stores/meals.ts`                                | Meal state management with Dexie.js integration                               |
| `src/routes/api/meals/+server.ts`                        | GET (list by child+date) and POST (create meal with items) endpoints          |
| `src/routes/api/meals/[id]/+server.ts`                   | PUT (update) and DELETE (remove) meal endpoints                               |
| `src/lib/domain/services/meal-logging.ts`                | Pure domain logic for meal operations                                         |

### Step-by-Step Instructions

#### Step 1: Create the food tracking domain service (`src/lib/domain/services/food-tracking.ts`)

This is a pure module with no side effects, containing all the business logic for food tracking:

```typescript
import type { FoodLog, FoodSubItem } from "$lib/domain/models";

export type FoodStatus = "neutral" | "eliminated" | "reintroduced";

/**
 * Cumulative elimination state: returns the most recent FoodLog action
 * for the given category on or before the given date. If no log exists
 * for that category before the date, the food is considered "neutral"
 * (neither eliminated nor reintroduced).
 */
export function getFoodStatus(
  logs: FoodLog[],
  categoryId: string,
  date: string,
): FoodStatus {
  const itemLogs = logs
    .filter((l) => l.categoryId === categoryId && l.date <= date)
    .sort((a, b) => {
      // Sort by date descending, then by createdAt descending
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  if (itemLogs.length === 0) return "neutral";
  return itemLogs[0].action;
}

/**
 * Compute the next status in the toggle cycle:
 * neutral -> eliminated -> reintroduced -> neutral
 */
export function getNextStatus(current: FoodStatus): FoodStatus {
  const cycle: FoodStatus[] = ["neutral", "eliminated", "reintroduced"];
  const idx = cycle.indexOf(current);
  return cycle[(idx + 1) % cycle.length];
}

/**
 * Count active eliminations for a given day.
 * An item is "actively eliminated" if the most recent log entry
 * on or before the given date has action = 'eliminated'.
 */
export function countActiveEliminations(
  logs: FoodLog[],
  date: string,
  allCategoryIds: string[],
): number {
  return allCategoryIds.filter(
    (itemId) => getFoodStatus(logs, itemId, date) === "eliminated",
  ).length;
}

/**
 * Determine the dot colour tier for a day based on elimination count.
 */
export function getDotTier(
  eliminationCount: number,
): "none" | "low" | "medium" | "high" {
  if (eliminationCount === 0) return "none";
  if (eliminationCount <= 3) return "low";
  if (eliminationCount <= 6) return "medium";
  return "high";
}

/**
 * Generate food log entries to copy yesterday's state to today.
 * Returns an array of new FoodLog entries (without id) to be created.
 */
export function copyFromYesterday(
  yesterdayLogs: FoodLog[],
  childId: string,
  todayDate: string,
  allCategoryIds: string[],
): Array<Omit<FoodLog, "id" | "createdAt" | "updatedAt">> {
  const newEntries: Array<Omit<FoodLog, "id" | "createdAt" | "updatedAt">> = [];
  const yesterdayDate = getPreviousDate(todayDate);

  for (const itemId of allCategoryIds) {
    const status = getFoodStatus(yesterdayLogs, itemId, yesterdayDate);
    if (status !== "neutral") {
      newEntries.push({
        childId,
        categoryId: itemId,
        date: todayDate,
        action: status,
      });
    }
  }

  return newEntries;
}

/**
 * Get the previous calendar date as an ISO string.
 */
export function getPreviousDate(isoDate: string): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}
```

**Cumulative elimination state (server-side):**

The domain service method for server-side queries:

```typescript
// Domain service method
async getFoodStatus(childId: string, categoryId: string, date: string): Promise<'eliminated' | 'reintroduced' | 'neutral'> {
  const log = await this.repository.getMostRecentFoodLog(childId, categoryId, date);
  return log?.action ?? 'neutral';
}
```

Add to the DataRepository port:

```typescript
getMostRecentFoodLog(childId: string, categoryId: string, onOrBeforeDate: string): Promise<FoodLog | null>;
```

SQL implementation:

```sql
SELECT * FROM food_logs
WHERE child_id = $1 AND category_id = $2 AND date <= $3
ORDER BY date DESC, created_at DESC
LIMIT 1;
```

Also update `getCurrentEliminationState` to accept a `date` parameter so that the elimination state can be queried for any date, not just "now".

#### Step 2: Create calendar utility functions

Within the calendar components or a shared utility, implement:

- `getMonthDays(year: number, month: number)`: Returns an array of date objects for the entire month grid including padding days from adjacent months.
- `formatMonthYear(year: number, month: number, locale: string)`: Returns a formatted string like "Brezen 2026" (Czech).
- `isToday(date: string)`: Compares against today's date.
- `isSameMonth(date: string, year: number, month: number)`: Checks if a date belongs to the displayed month.

#### Step 3: Build the CalendarHeader component

```svelte
<!-- src/lib/components/calendar/CalendarHeader.svelte -->
<script lang="ts">
  let { year, month, onPrev, onNext } = $props<{
    year: number;
    month: number;
    onPrev: () => void;
    onNext: () => void;
  }>();
</script>

<div class="flex items-center justify-between px-4 py-3">
  <button onclick={onPrev} class="p-2 text-primary" aria-label="Previous month">
    <!-- Left arrow SVG -->
  </button>
  <h2 class="text-lg font-semibold text-text">
    {formatMonthYear(year, month, 'cs-CZ')}
  </h2>
  <button onclick={onNext} class="p-2 text-primary" aria-label="Next month">
    <!-- Right arrow SVG -->
  </button>
</div>
```

#### Step 4: Build the CalendarGrid component

The grid renders 7 columns (Po, Ut, St, Ct, Pa, So, Ne for Czech locale) with rows for each week. Each cell is a `DayCell` component. The grid receives the array of dates from `getMonthDays()` and the food log data for dot rendering.

#### Step 5: Build the DayCell component

Each cell displays:

- The day number, with muted styling if outside the current month.
- A bold or highlighted background if it is today.
- A coloured dot below the number based on the dot tier (none/low/medium/high).
- An `on:click` handler that navigates to the day detail view.

#### Step 6: Build the SwipeContainer component

A wrapper that detects horizontal touch gestures:

```typescript
let touchStartX = 0;
let touchEndX = 0;
const SWIPE_THRESHOLD = 50; // minimum pixels

function onTouchStart(e: TouchEvent) {
  touchStartX = e.changedTouches[0].screenX;
}

function onTouchEnd(e: TouchEvent) {
  touchEndX = e.changedTouches[0].screenX;
  const diff = touchStartX - touchEndX;
  if (Math.abs(diff) > SWIPE_THRESHOLD) {
    if (diff > 0)
      onSwipeLeft(); // next month
    else onSwipeRight(); // previous month
  }
}
```

#### Step 7: Build the FoodCategoryGrid component

Fetches food categories (from the store or server load data) and renders them as a responsive grid. Each tile is a `FoodCategoryTile`. The grid passes the expanded category ID down to implement accordion behaviour.

```svelte
<div class="grid grid-cols-3 gap-3 p-4 sm:grid-cols-4">
  {#each categories as category}
    <FoodCategoryTile
      {category}
      isExpanded={expandedCategoryId === category.id}
      ontoggle={() => toggleCategory(category.id)}
    />
  {/each}
</div>
```

#### Step 8: Build the FoodCategoryTile component

Displays the emoji and Czech name. When tapped, dispatches a `toggle` event. When expanded, renders the `FoodSubItemList` below the tile (breaking out of the grid flow using CSS grid span or absolute positioning).

#### Step 9: Build the FoodSubItemList and FoodSubItemToggle components

`FoodSubItemList` renders a list of `FoodSubItemToggle` components for each sub-item in the category.

`FoodSubItemToggle` displays:

- The food item's Czech name.
- A visual status indicator: neutral (grey circle), eliminated (red circle with X), reintroduced (green circle with checkmark).
- On tap, calls the food tracking service to compute the next status and dispatches a mutation.

**Undo support:** After each food toggle (eliminate/reintroduce), show a toast notification with an "Zpět" (Undo) button for 5 seconds. If tapped, delete the FoodLog entry that was just created. This prevents accidental toggles from corrupting the elimination timeline and correlation data.

```svelte
<!-- Toast with undo -->
<Toast duration={5000}>
  {action === 'eliminated' ? 'Vyřazeno' : 'Znovuzavedeno'}: {categoryName}
  <button onclick={undoLastToggle}>Zpět</button>
</Toast>
```

#### Step 10: Build the "Copy from yesterday" button

Renders a button that, when tapped:

1. Calls `copyFromYesterday()` from the food tracking service.
2. If the current day already has entries, shows a confirmation: "Overwrite current entries?" or "Merge with current entries?".
3. On confirm, creates all the new food log entries via the store.
4. If yesterday has no entries, the button is visually disabled with a tooltip "No entries yesterday".

#### Step 11: Assemble the calendar page (`src/routes/(app)/calendar/+page.svelte`)

```svelte
<script lang="ts">
  import CalendarHeader from '$lib/components/calendar/CalendarHeader.svelte';
  import CalendarGrid from '$lib/components/calendar/CalendarGrid.svelte';
  import SwipeContainer from '$lib/components/calendar/SwipeContainer.svelte';
  import { getYear, getMonth, navigateMonth } from '$lib/stores/calendar.svelte';

  const year = $derived(getYear());
  const month = $derived(getMonth());

  function prevMonth() {
    navigateMonth(-1);
  }

  function nextMonth() {
    navigateMonth(1);
  }
</script>

<SwipeContainer onSwipeLeft={nextMonth} onSwipeRight={prevMonth}>
  <CalendarHeader {year} {month} onPrev={prevMonth} onNext={nextMonth} />
  <CalendarGrid {year} {month} />
</SwipeContainer>
```

#### Step 12: Build the day detail view (`src/routes/(app)/calendar/[date]/+page.svelte`)

This page receives the date from the URL parameter. It loads:

- All food categories and items (from store or server data).
- All food logs for the selected day and child (from Dexie.js first, then server).

It renders:

- A header with the formatted date and a back button.
- The `FoodCategoryGrid` with the current day's status.
- The `CopyFromYesterdayButton`.

#### Step 13: Implement the food log store with Dexie.js (`src/lib/stores/food-log.svelte.ts`)

```typescript
// src/lib/stores/food-log.svelte.ts (Svelte 5 runes)
import { db } from "$lib/adapters/dexie-db";
import { getSelectedChild } from "$lib/stores/children.svelte";
import type { FoodLog } from "$lib/domain/models";
import { syncToServer } from "$lib/adapters/sync";

let logs = $state<FoodLog[]>([]);

export function getLogs() {
  return logs;
}

export async function loadForDateRange(
  childId: string,
  startDate: string,
  endDate: string,
) {
  // Load from Dexie first (offline-first)
  logs = await db.foodLogs
    .where("[childId+date]")
    .between([childId, startDate], [childId, endDate], true, true)
    .toArray();

  // Then fetch from server and merge
  try {
    const res = await fetch(
      `/api/food-logs?childId=${childId}&startDate=${startDate}&endDate=${endDate}`,
    );
    if (res.ok) {
      const serverLogs: FoodLog[] = await res.json();
      await db.foodLogs.bulkPut(serverLogs);
      logs = await db.foodLogs
        .where("[childId+date]")
        .between([childId, startDate], [childId, endDate], true, true)
        .toArray();
    }
  } catch {
    // Offline -- local data is already displayed
  }
}

export async function toggleFood(
  childId: string,
  categoryId: string,
  date: string,
  action: "eliminated" | "reintroduced",
  createdBy: string,
) {
  const now = new Date().toISOString();
  const newLog: FoodLog = {
    id: crypto.randomUUID(),
    childId,
    categoryId,
    date,
    action,
    createdBy,
    createdAt: now,
    updatedAt: now,
    syncedAt: undefined,
  };

  // Optimistic update
  logs = [...logs, newLog];
  await db.foodLogs.put(newLog);
  syncToServer();
}

export async function copyFromYesterday(
  entries: Array<Omit<FoodLog, "id" | "createdAt" | "updatedAt">>,
) {
  const now = new Date().toISOString();
  const newLogs: FoodLog[] = entries.map((e) => ({
    ...e,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    syncedAt: undefined,
  }));

  logs = [...logs, ...newLogs];
  await db.foodLogs.bulkPut(newLogs);
  syncToServer();
}
```

#### Step 14: Implement the background sync engine (`src/lib/adapters/sync.ts`)

```typescript
import { db } from "./dexie-db";

let isSyncing = false;

export async function syncToServer(): Promise<void> {
  if (isSyncing || !navigator.onLine) return;
  isSyncing = true;

  try {
    const unsyncedLogs = await db.foodLogs
      .filter((log) => log.syncedAt === undefined || log.syncedAt === null)
      .toArray();

    if (unsyncedLogs.length === 0) return;

    const res = await fetch("/api/food-logs/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logs: unsyncedLogs }),
    });

    if (res.ok) {
      const now = new Date();
      await db.foodLogs.bulkUpdate(
        unsyncedLogs.map((log) => ({
          key: log.id,
          changes: { syncedAt: now },
        })),
      );
    }
  } catch {
    // Will retry on next online event or next mutation
  } finally {
    isSyncing = false;
  }
}

// Listen for online events
if (typeof window !== "undefined") {
  window.addEventListener("online", () => syncToServer());
}
```

#### Step 15: Build server API routes for food logs

**`GET /api/food-logs`** (`src/routes/api/food-logs/+server.ts`):

Query parameters: `childId` (required), `startDate` (required), `endDate` (required). Validate that the child belongs to the authenticated user. Query `food_logs` table with date range filter. Return 200 with array.

**`POST /api/food-logs`** (`src/routes/api/food-logs/+server.ts`):

Accept `{ childId, categoryId, date, action }`. Validate child ownership. Validate `action` is `'eliminated'` or `'reintroduced'`. Insert into `food_logs`. Return 201.

**`POST /api/food-logs/batch`** (`src/routes/api/food-logs/batch/+server.ts`):

Accept `{ logs: FoodLog[] }`. For each log, validate child ownership and upsert (insert or update based on `id`). Return 200 with count of synced records. This endpoint is used by the background sync engine.

**`PUT /api/food-logs/[id]`** (`src/routes/api/food-logs/[id]/+server.ts`):

Accept `{ action }`. Validate ownership via child. Update the record. Return 200.

**`DELETE /api/food-logs/[id]`** (`src/routes/api/food-logs/[id]/+server.ts`):

Validate ownership. Delete the record. Return 204.

#### Step 16: Create the calendar store (`src/lib/stores/calendar.svelte.ts`)

```typescript
// src/lib/stores/calendar.svelte.ts (Svelte 5 runes)
const now = new Date();

let year = $state(now.getFullYear());
let month = $state(now.getMonth()); // 0-indexed
let selectedDate = $state<string | null>(null);

export function getYear() {
  return year;
}
export function getMonth() {
  return month;
}
export function getSelectedDate() {
  return selectedDate;
}
export function setSelectedDate(date: string | null) {
  selectedDate = date;
}
export function navigateMonth(delta: number) {
  month += delta;
  if (month > 11) {
    month = 0;
    year++;
  }
  if (month < 0) {
    month = 11;
    year--;
  }
}
```

#### Step 17: Wire the food page as an alternative entry point

The `/food` route provides direct access to the food category grid for the current day without going through the calendar. It reuses `FoodCategoryGrid` with today's date pre-selected.

#### Step 18: Load food categories and items into client stores

On app load (in the `(app)` layout), fetch food categories and items from the server and cache them in Dexie.js. These are relatively static data and change rarely:

```typescript
// In (app)/+layout.svelte onMount or load function
const categories = await db.foodCategories.toArray();
if (categories.length === 0) {
  const res = await fetch("/api/food-categories");
  const data = await res.json();
  await db.foodCategories.bulkPut(data.categories);
  await db.foodItems.bulkPut(data.items);
}
```

Create a `GET /api/food-categories` endpoint that returns all categories with their items.

#### Step 19: Create the meal logging domain service (`src/lib/domain/services/meal-logging.ts`)

Pure module for meal operations:

```typescript
import type { Meal, MealItem, FoodSubItem } from "$lib/domain/models";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Snídaně",
  lunch: "Oběd",
  dinner: "Večeře",
  snack: "Svačina",
};

/**
 * Resolve the display name for a meal item.
 * Uses the Czech name from the predefined sub-item if available,
 * otherwise falls back to the custom name.
 */
export function getMealItemDisplayName(
  item: MealItem,
  subItems: FoodSubItem[],
): string {
  if (item.subItemId) {
    const subItem = subItems.find((si) => si.id === item.subItemId);
    return subItem?.nameCs ?? item.customName ?? "Neznámá položka";
  }
  return item.customName ?? "Neznámá položka";
}

/**
 * Format a meal for display: "Oběd: vepřové, brambory, zapečené mléko"
 */
export function formatMealSummary(
  meal: Meal,
  items: MealItem[],
  subItems: FoodSubItem[],
): string {
  const label = MEAL_TYPE_LABELS[meal.mealType as MealType];
  const itemNames = items.map((i) => getMealItemDisplayName(i, subItems));
  const suffix = meal.label ? ` (${meal.label})` : "";
  return `${label}${suffix}: ${itemNames.join(", ")}`;
}

/**
 * Resolve categoryId for a meal item from its subItemId.
 */
export function resolveCategoryId(
  subItemId: string,
  subItems: FoodSubItem[],
): string | undefined {
  return subItems.find((si) => si.id === subItemId)?.categoryId;
}
```

#### Step 20: Build the MealItemPicker component (`src/lib/components/food/MealItemPicker.svelte`)

A searchable input that:

1. As the user types, filters predefined `FoodSubItem` entries matching the Czech name.
2. Shows a dropdown of matching sub-items grouped by category.
3. Tapping a sub-item adds it to the meal (creates a `MealItem` with `subItemId`).
4. If no match is found, the user can press Enter to add the typed text as a custom item (`MealItem` with `customName`).
5. Added items appear as removable chips/tags below the input.

```svelte
<script lang="ts">
  let { subItems, selectedItems, onAdd, onRemove } = $props<{
    subItems: FoodSubItem[];
    selectedItems: MealItem[];
    onAdd: (item: Partial<MealItem>) => void;
    onRemove: (index: number) => void;
  }>();

  let query = $state('');

  const filtered = $derived(
    query.length >= 2
      ? subItems.filter(si => si.nameCs.toLowerCase().includes(query.toLowerCase()))
      : []
  );
</script>

<div class="relative">
  <input
    type="text"
    bind:value={query}
    placeholder="Přidej položku..."
    class="w-full rounded-lg border px-3 py-2"
  />
  {#if filtered.length > 0}
    <ul class="absolute z-10 w-full bg-white border rounded-lg shadow mt-1 max-h-48 overflow-y-auto">
      {#each filtered as item}
        <li>
          <button
            class="w-full text-left px-3 py-2 hover:bg-gray-100"
            onclick={() => { onAdd({ subItemId: item.id, categoryId: item.categoryId }); query = ''; }}
          >
            {item.nameCs}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
<!-- Chips for selected items -->
<div class="flex flex-wrap gap-2 mt-2">
  {#each selectedItems as item, i}
    <span class="inline-flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm">
      {getMealItemDisplayName(item, subItems)}
      <button onclick={() => onRemove(i)} class="ml-1">&times;</button>
    </span>
  {/each}
</div>
```

#### Step 21: Build the MealComposer component (`src/lib/components/food/MealComposer.svelte`)

A form for creating a meal:

1. Meal type selector: four buttons for Snídaně/Oběd/Večeře/Svačina.
2. Optional label text input.
3. `MealItemPicker` for adding food items.
4. "Uložit" (Save) button that creates the Meal + MealItems.

#### Step 22: Build the MealCard and MealList components

`MealCard` displays a single meal with type label, optional custom label, and comma-separated food item names.

`MealList` renders all meals for a given day, with a "Přidat jídlo" (Add meal) button that opens the `MealComposer`.

#### Step 23: Integrate meals into the day detail view

Update `src/routes/(app)/calendar/[date]/+page.svelte` to show two sections:

1. **Eliminované potraviny** (Eliminated foods) -- existing food category grid with toggle functionality.
2. **Jídla** (Meals) -- `MealList` component showing logged meals + `MealComposer` for adding new ones.

#### Step 24: Build the meal store with Dexie.js (`src/lib/stores/meals.ts`)

Similar pattern to `food-log.ts`: offline-first with Dexie.js, optimistic UI updates, background sync.

#### Step 25: Build server API routes for meals

**`GET /api/meals?date=YYYY-MM-DD`** -- returns all meals with their items for the authenticated user and date. Each meal includes its `items` array with resolved display names.

**`POST /api/meals`** -- accepts `{ date, mealType, label?, items: [{ subItemId?, customName?, categoryId? }] }`. Creates the meal for the authenticated user and all items in a transaction. Returns 201.

**`PUT /api/meals/[id]`** -- updates meal metadata and replaces items (delete old items, insert new ones in a transaction). Returns 200.

**`DELETE /api/meals/[id]`** -- deletes meal and cascades to items. Returns 204.

### Key Code Patterns

**Food toggle state machine:**

The food status follows a strict cycle: `neutral -> eliminated -> reintroduced -> neutral`. This is a pure function with no side effects, making it easy to test:

```typescript
// Toggle cycle
const CYCLE: FoodStatus[] = ["neutral", "eliminated", "reintroduced"];
export function getNextStatus(current: FoodStatus): FoodStatus {
  return CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
}
```

**Offline-first data flow:**

```
User action
  -> Optimistic UI update (Svelte store)
  -> Write to Dexie.js (local persistence)
  -> Attempt server sync (background, non-blocking)
  -> On success: mark as synced in Dexie.js
  -> On failure: leave unsynced, retry on next online event
```

This pattern ensures the UI is always responsive regardless of network state. Data consistency is eventual -- the server is the source of truth, but the client can operate independently.

**Calendar dot colour mapping:**

```typescript
const DOT_COLOURS = {
  none: "",
  low: "bg-warning", // yellow -- 1-3 eliminations
  medium: "bg-orange-500", // orange -- 4-6 eliminations
  high: "bg-danger", // red -- 7+ eliminations
} as const;
```

**Compound index query for date ranges in Dexie.js:**

```typescript
// Efficient query using the compound index [childId+date]
const logs = await db.foodLogs
  .where("[childId+date]")
  .between(
    [childId, startDate],
    [childId, endDate],
    true, // include lower bound
    true, // include upper bound
  )
  .toArray();
```

**Accordion behaviour for category expansion:**

```typescript
let expandedCategoryId: string | null = null;

function toggleCategory(categoryId: string) {
  expandedCategoryId = expandedCategoryId === categoryId ? null : categoryId;
}
```

### Empty States

Design encouraging empty states for first-time users:

- **Calendar (no food logs):** "Klepněte na dnešek a zaznamenejte první eliminaci." with a pointing-hand illustration.
- **Food grid (no eliminations today):** "Žádné změny v dietě pro tento den. Klepněte na kategorii pro eliminaci."
- **Meals (no meals logged):** "Přidejte první jídlo dne klepnutím na +."

### Two-User Attribution

Show the author's initials on food log entries: "Přidala M" (Added by M) as a small label next to each log entry. On the day detail view, show "Poslední úprava: [name] v [time]" (Last edit by [name] at [time]) to indicate whether the other parent has contributed today.

## Post-Implementation State

The main screen shows a calendar with the current month. Each day cell displays coloured dots indicating how many foods are actively eliminated for that day (yellow for 1-3, orange for 4-6, red for 7+). Users can swipe left/right or tap arrows to navigate between months. The current day is visually highlighted.

Tapping a day opens a detail view showing all 12 food categories as an emoji grid. Tapping a category expands it to reveal sub-items. Tapping a sub-item toggles its status through the cycle: neutral (no marking), eliminated (red indicator), reintroduced (green indicator). The "Copy from yesterday" button duplicates the previous day's elimination state to the current day.

All food log changes are saved to Dexie.js immediately for offline support. When the device is online, a background sync process pushes unsynced records to the PostgreSQL server. The app works entirely offline -- users can track food eliminations without internet access and data syncs automatically when connectivity returns.

Below the elimination grid, a "Jídla" (Meals) section shows logged meals for the day. Each meal displays its type (Snídaně/Oběd/Večeře/Svačina), optional label, and a list of food items. Users can add a new meal by selecting a meal type, searching/selecting food items from the predefined list or typing custom items, and saving. For example, the mother can log "Oběd: vepřové, brambory, zapečené mléko" by selecting lunch, picking items from the autocomplete, and saving.

The `/food` tab provides a direct shortcut to today's food tracking without going through the calendar. The child selector in the header determines which child's data is displayed and modified.

## Test Suite

### Unit Tests

**Test file: `src/lib/domain/services/food-tracking.test.ts`**

| #   | Test Case                                                               | Details                                                                                                                                             |
| --- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `getFoodStatus` returns `'neutral'` when no logs exist                  | Call with empty logs array. Assert result is `'neutral'`.                                                                                           |
| 2   | `getFoodStatus` returns `'eliminated'` after elimination log            | Create a log with `action: 'eliminated'`. Assert result is `'eliminated'`.                                                                          |
| 3   | `getFoodStatus` returns `'reintroduced'` after reintroduction log       | Create a log with `action: 'reintroduced'`. Assert result is `'reintroduced'`.                                                                      |
| 4   | `getFoodStatus` returns the most recent action when multiple logs exist | Create two logs: eliminated at T1, reintroduced at T2. Assert result is `'reintroduced'`.                                                           |
| 5   | `getFoodStatus` filters by date and categoryId                          | Create logs for different dates and items. Assert only matching logs affect the result.                                                             |
| 6   | `getNextStatus` cycles neutral -> eliminated                            | Assert `getNextStatus('neutral')` returns `'eliminated'`.                                                                                           |
| 7   | `getNextStatus` cycles eliminated -> reintroduced                       | Assert `getNextStatus('eliminated')` returns `'reintroduced'`.                                                                                      |
| 8   | `getNextStatus` cycles reintroduced -> neutral                          | Assert `getNextStatus('reintroduced')` returns `'neutral'`.                                                                                         |
| 9   | `countActiveEliminations` returns 0 for no logs                         | Call with empty logs. Assert result is `0`.                                                                                                         |
| 10  | `countActiveEliminations` counts only eliminated items                  | Create logs: item A eliminated, item B reintroduced, item C neutral. Assert count is `1`.                                                           |
| 11  | `countActiveEliminations` handles multiple items correctly              | Create logs: 5 items eliminated, 2 reintroduced. Assert count is `5`.                                                                               |
| 12  | `getDotTier` returns `'none'` for 0                                     | Assert `getDotTier(0)` returns `'none'`.                                                                                                            |
| 13  | `getDotTier` returns `'low'` for 1-3                                    | Assert `getDotTier(1)`, `getDotTier(3)` both return `'low'`.                                                                                        |
| 14  | `getDotTier` returns `'medium'` for 4-6                                 | Assert `getDotTier(4)`, `getDotTier(6)` both return `'medium'`.                                                                                     |
| 15  | `getDotTier` returns `'high'` for 7+                                    | Assert `getDotTier(7)`, `getDotTier(20)` both return `'high'`.                                                                                      |
| 16  | `copyFromYesterday` returns empty array when yesterday has no entries   | Call with empty yesterday logs. Assert result is `[]`.                                                                                              |
| 17  | `copyFromYesterday` copies eliminated items from yesterday              | Create yesterday logs: item A eliminated, item B eliminated. Call for today. Assert 2 entries returned, both with today's date and correct actions. |
| 18  | `copyFromYesterday` skips neutral items                                 | Create yesterday logs: item A eliminated, item B reintroduced, item C neutral. Assert only 2 entries returned (A and B).                            |
| 19  | `copyFromYesterday` sets correct childId and date                       | Assert all returned entries have the provided `childId` and `todayDate`.                                                                            |
| 20  | `getPreviousDate` computes correctly across month boundary              | Assert `getPreviousDate('2026-03-01')` returns `'2026-02-28'`.                                                                                      |
| 21  | `getPreviousDate` computes correctly for leap year                      | Assert `getPreviousDate('2024-03-01')` returns `'2024-02-29'`.                                                                                      |
| 22  | `getPreviousDate` computes correctly across year boundary               | Assert `getPreviousDate('2026-01-01')` returns `'2025-12-31'`.                                                                                      |

**Test file: `src/lib/components/calendar/calendar-utils.test.ts`**

| #   | Test Case                                                      | Details                                                                                  |
| --- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 23  | `getMonthDays` returns 28-31 days for the target month         | Call for February 2026 (28 days) and March 2026 (31 days). Assert correct day counts.    |
| 24  | `getMonthDays` includes padding days for complete weeks        | Call for March 2026 (starts on Sunday). Assert the grid array length is a multiple of 7. |
| 25  | `getMonthDays` marks padding days as outside the current month | Assert first/last entries (if from adjacent months) have a flag `isCurrentMonth: false`. |
| 26  | `isToday` returns true for today's date                        | Generate today's ISO date string. Assert `isToday` returns `true`.                       |
| 27  | `isToday` returns false for yesterday                          | Assert `isToday('2020-01-01')` returns `false`.                                          |
| 28  | `isSameMonth` correctly identifies matching month              | Assert `isSameMonth('2026-03-15', 2026, 2)` returns `true` (0-indexed month 2 = March).  |

**Test file: `src/lib/domain/services/meal-logging.test.ts`**

| #   | Test Case                                                             | Details                                                                                               |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 29  | `getMealItemDisplayName` returns Czech name for predefined sub-item   | Create MealItem with `subItemId` pointing to "cows-milk". Assert returns "Kravské mléko".             |
| 30  | `getMealItemDisplayName` returns custom name when no subItemId        | Create MealItem with `customName: 'vepřové'`. Assert returns "vepřové".                               |
| 31  | `getMealItemDisplayName` returns custom name when subItemId not found | Create MealItem with invalid `subItemId` and `customName: 'neznámé'`. Assert returns "neznámé".       |
| 32  | `formatMealSummary` formats meal with type and items                  | Create lunch meal with 3 items. Assert returns "Oběd: vepřové, brambory, zapečené mléko".             |
| 33  | `formatMealSummary` includes label when present                       | Create meal with `label: 'u babičky'`. Assert returns "Oběd (u babičky): ..."                         |
| 34  | `formatMealSummary` handles empty items list                          | Create meal with no items. Assert returns "Snídaně: " (empty items).                                  |
| 35  | `resolveCategoryId` returns correct category for known sub-item       | Assert `resolveCategoryId('cows-milk-id', subItems)` returns dairy category ID.                       |
| 36  | `resolveCategoryId` returns undefined for unknown sub-item            | Assert `resolveCategoryId('nonexistent', subItems)` returns `undefined`.                              |
| 37  | `MEAL_TYPE_LABELS` contains all four Czech labels                     | Assert all keys present: breakfast → "Snídaně", lunch → "Oběd", dinner → "Večeře", snack → "Svačina". |

### Integration Tests

**Test file: `tests/integration/food-logs-api.test.ts`**

| #   | Test Case                                                      | Details                                                                                                                        |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 29  | `GET /api/food-logs` returns empty array for new child         | Register, login, create child, query food logs for a date range. Assert 200 and empty array.                                   |
| 30  | `POST /api/food-logs` creates a food log entry                 | Send `{ childId, categoryId, date: '2026-03-20', action: 'eliminated' }`. Assert 201. Assert response has `id` and all fields. |
| 31  | `GET /api/food-logs` returns created entries within date range | Create 3 entries on different dates. Query with a range covering 2 of them. Assert array length is 2.                          |
| 32  | `GET /api/food-logs` excludes entries outside date range       | Create entry on 2026-03-20. Query range 2026-03-21 to 2026-03-31. Assert empty array.                                          |
| 33  | `PUT /api/food-logs/[id]` updates the action                   | Create an `'eliminated'` entry. Update to `'reintroduced'`. Assert 200 and updated action.                                     |
| 34  | `DELETE /api/food-logs/[id]` removes the entry                 | Create an entry, then delete. Assert 204. Query and assert it is gone.                                                         |
| 35  | `POST /api/food-logs` rejects invalid action                   | Send `action: 'invalid'`. Assert 400.                                                                                          |
| 36  | `POST /api/food-logs` rejects non-owned child                  | User A creates child. User B tries to create a food log for that child. Assert 403.                                            |
| 37  | `GET /api/food-logs` requires `childId` parameter              | Send without `childId`. Assert 400.                                                                                            |
| 38  | `POST /api/food-logs/batch` syncs multiple entries             | Send 5 food log entries in one batch. Assert 200. Query individually and assert all 5 exist.                                   |
| 39  | `POST /api/food-logs/batch` handles upsert correctly           | Send an entry, then send it again with a different action in a batch. Assert the action is updated, not duplicated.            |
| 40  | All food log endpoints require authentication                  | Call each endpoint without a session cookie. Assert 401 or redirect.                                                           |

**Test file: `tests/integration/food-categories-api.test.ts`**

| #   | Test Case                                                    | Details                                                                                              |
| --- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| 41  | `GET /api/food-categories` returns all categories with items | Assert response contains at least 12 categories. Assert each category has a non-empty `items` array. |
| 42  | `GET /api/food-categories` requires authentication           | Call without session. Assert 401 or redirect.                                                        |

**Test file: `tests/integration/meals-api.test.ts`**

| #   | Test Case                                                            | Details                                                                                                                                                                                  |
| --- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 43  | `POST /api/meals` creates a meal with predefined items               | Send `{ date, mealType: 'lunch', items: [{ subItemId: 'cows-milk-id' }, { subItemId: 'potato-id' }] }`. Assert 201 with meal ID and 2 items. Meal is associated with authenticated user. |
| 44  | `POST /api/meals` creates a meal with custom items                   | Send `{ date, mealType: 'dinner', items: [{ customName: 'vepřové' }] }`. Assert 201.                                                                                                     |
| 45  | `POST /api/meals` creates a meal with mixed items                    | Send items: one with `subItemId`, one with `customName`. Assert 201 and both items stored.                                                                                               |
| 46  | `GET /api/meals?date=YYYY-MM-DD` returns meals with items            | Create 2 meals. Assert GET returns both with correct item arrays for the authenticated user.                                                                                             |
| 47  | `GET /api/meals` returns empty for date with no meals                | Query a date with no meals. Assert 200 and empty array.                                                                                                                                  |
| 48  | `PUT /api/meals/[id]` updates meal metadata and replaces items       | Create meal with 2 items. Update with 3 different items. Assert old items removed and new items present.                                                                                 |
| 49  | `DELETE /api/meals/[id]` removes meal and cascades to items          | Create meal with items. Delete. Assert 204. Query items separately and assert they are gone.                                                                                             |
| 50  | `POST /api/meals` rejects invalid mealType                           | Send `mealType: 'brunch'`. Assert 400.                                                                                                                                                   |
| 51  | `POST /api/meals` rejects meal with no items                         | Send empty items array. Assert 400.                                                                                                                                                      |
| 52  | `POST /api/meals` rejects item with neither subItemId nor customName | Send item `{}`. Assert 400.                                                                                                                                                              |
| 53  | All meal endpoints require authentication                            | Call each endpoint without session cookie. Assert 401 or redirect.                                                                                                                       |
| 54  | `GET /api/meals` scopes to authenticated user                        | User A creates meals. User B queries the same date. Assert User B sees only their own meals (empty if they logged none).                                                                 |

### E2E / Manual Tests

**Test script: Calendar Navigation**

1. Log in and navigate to `/calendar`.
2. **Expected:** The current month (March 2026) is displayed. Today (March 23) is highlighted.
3. Tap the right arrow (next month).
4. **Expected:** April 2026 is displayed. The header updates.
5. Tap the left arrow twice.
6. **Expected:** February 2026 is displayed.
7. On a touch device, swipe left.
8. **Expected:** March 2026 is displayed.

**Test script: Food Elimination Workflow**

1. Log in. Ensure at least one child exists. Select the child.
2. Navigate to `/calendar`. Tap today's date.
3. **Expected:** Day detail view opens showing food category grid.
4. Tap the dairy category tile.
5. **Expected:** The tile expands to show sub-items: Mleko, Syr, Maslo, Jogurt, Smetana.
6. Tap "Mleko".
7. **Expected:** Mleko shows an eliminated status (red indicator). The UI updates instantly.
8. Tap "Mleko" again.
9. **Expected:** Mleko shows a reintroduced status (green indicator).
10. Tap "Mleko" a third time.
11. **Expected:** Mleko returns to neutral (no indicator).
12. Navigate back to the calendar.
13. **Expected:** Today's cell does not show a dot (no active eliminations).
14. Go back to today's detail view. Eliminate Mleko and Syr.
15. Navigate back to the calendar.
16. **Expected:** Today's cell shows a yellow dot (2 eliminations).

**Test script: Copy From Yesterday**

1. Navigate to yesterday's date in the calendar. Open the detail view.
2. Eliminate 3 food items (e.g., Mleko, Vejce, Psenice).
3. Navigate to today's date.
4. Tap "Copy from yesterday".
5. **Expected:** The 3 items are now shown as eliminated for today.
6. Navigate to the calendar view.
7. **Expected:** Both yesterday and today show yellow dots.

**Test script: Offline Mode**

1. Open the app and navigate to today's food detail view.
2. Open browser DevTools, go to Network tab, toggle "Offline" mode.
3. Eliminate 2 food items.
4. **Expected:** The UI updates immediately. No errors are shown.
5. Navigate to the calendar. The dots update.
6. Turn off offline mode (re-enable network).
7. **Expected:** After a brief moment, the data syncs to the server. Refresh the page -- the eliminations persist (loaded from server).
8. Open a second browser/device, log in as the same user.
9. **Expected:** The food logs from the first device appear after the sync completed.

**Test script: Food Category Accordion**

1. Open a day detail view with the food category grid.
2. Tap the dairy category.
3. **Expected:** Dairy sub-items expand.
4. Tap the eggs category.
5. **Expected:** Dairy collapses and eggs sub-items expand (accordion).
6. Tap the eggs category again.
7. **Expected:** Eggs collapses. No category is expanded.

**Test script: Meal Logging Workflow**

1. Log in. Select a child. Navigate to today's date detail view.
2. Scroll below the elimination grid to the "Jídla" (Meals) section.
3. **Expected:** Section shows "Žádná jídla pro tento den" (No meals for this day) if empty, plus an "Přidat jídlo" (Add meal) button.
4. Tap "Přidat jídlo".
5. **Expected:** Meal composer appears with meal type buttons and food item picker.
6. Tap "Oběd" (Lunch) in the meal type selector.
7. In the food item picker, type "mle".
8. **Expected:** Autocomplete dropdown shows "Kravské mléko", "Sojové mléko", "Mléčná čokoláda", etc.
9. Tap "Kravské mléko".
10. **Expected:** "Kravské mléko" appears as a chip/tag below the input.
11. Type "vepřové" and press Enter (no autocomplete match).
12. **Expected:** "vepřové" appears as a custom chip alongside "Kravské mléko".
13. Tap "Uložit" (Save).
14. **Expected:** Meal appears in the meals list: "Oběd: Kravské mléko, vepřové". Composer closes.
15. Add a second meal (Svačina with one item).
16. **Expected:** Both meals visible in the list.

**Test script: Meal Editing and Deletion**

1. From a day with logged meals, tap on a meal card.
2. **Expected:** Meal opens in edit mode (composer pre-filled with existing data).
3. Remove one item (tap X on chip). Add a new item.
4. Tap "Uložit".
5. **Expected:** Meal updates in the list with the changed items.
6. Long-press or swipe a meal card.
7. **Expected:** Delete option appears. Confirm deletion.
8. **Expected:** Meal removed from the list.

**Test script: Food Page Shortcut**

1. Tap the "Food" tab in the bottom navigation.
2. **Expected:** The food category grid is shown for today's date for the selected child.
3. Eliminate a food item.
4. Navigate to the calendar and tap today.
5. **Expected:** The elimination made via the Food tab is reflected.

### Regression Checks

All Phase 0 and Phase 1 checks must still pass:

- [ ] `bun run dev` starts without errors.
- [ ] `bun run build` completes without errors.
- [ ] TypeScript compilation (`bunx tsc --noEmit`) passes with zero errors.
- [ ] The PWA manifest is valid and the service worker registers.
- [ ] The bottom navigation bar renders correctly on a 375px viewport.
- [ ] `docker compose up -d` starts PostgreSQL and it accepts connections.
- [ ] All Dexie.js tables are accessible after `db.open()`.
- [ ] User registration, login, and logout work correctly.
- [ ] Auth guard redirects unauthenticated users to `/login`.
- [ ] Child management (CRUD) in Settings works correctly.
- [ ] Child selector in the header works and persists selection.
- [ ] Food categories and items are seeded in the database (12 categories, 30+ items).
- [ ] Navigating to `/` redirects appropriately (to `/calendar` if authenticated, to `/login` if not).
