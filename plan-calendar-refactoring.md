# Plan: Calendar Tab Refactoring — Prototype v5 → Production

## Analysis

### Prototype v5 (`src/routes/prototype/+page.svelte`)

Self-contained ~615-line Svelte component implementing the calendar UX with:

- **View mode**: Tap a day → inline card below calendar shows eliminated/reintroduced items for that date
- **Edit mode**: "Upravit" button → range-based date selection (tap start, tap end) → toggle eliminate/reintroduce with iOS-style switches → "Uložit" saves draft to all days in range
- **Draft/save workflow**: Changes are staged in `draftEliminated`/`draftReintroduced` Sets, only committed on save
- **Action mode toggle**: Switch between "Vyřadit" (eliminate) and "Zavést zpět" (reintroduce) — reintroduce mode filters to only show currently eliminated items
- **Two-color dot indicators**: Primary color for eliminations, `#4A7C6F` green for reintroductions — split dot when both
- **Floating save bar**: Shows selected range, day count, and save button
- **Hardcoded data**: 12 categories with sub-items inline, per-date `Set<string>` data model
- **No meals, no API calls, no stores**

### In-progress changes (uncommitted working tree)

Completely different UX model:

- **Bottom sheet day detail** with tabs ("Eliminace" | "Jídla")
- **Single-date editing** with immediate three-state cycling toggles (no draft/save)
- **Tile-based food grid** (not toggle switches)
- **Meal CRUD** (composer, cards, item picker)
- **Copy from yesterday**
- **Single-color dot indicators** based on elimination count tiers
- **API-driven**: Fetches categories, logs, meals from server
- **Component-heavy**: ~19 new files across components/calendar, components/food, stores, utils, services

### Key differences

| Aspect | Prototype v5 | In-progress |
|---|---|---|
| Day interaction | Inline card below calendar | Bottom sheet overlay |
| Editing scope | Date range (multi-day) | Single date |
| Edit workflow | Draft → Save | Immediate toggle |
| Toggle UI | iOS-style switches | Tile badges + cycling |
| Action modes | Eliminate / Reintroduce toggle | Three-state per item |
| Dot indicators | Two-color split (elim + reintro) | Single-color tiers |
| Meals | Not included | Full CRUD |
| Data source | Hardcoded Sets | API + Dexie stores |

### Decision: Discard in-progress UI, rebuild from prototype

The prototype's **range-based editing with draft/save** is the app's killer feature for elimination diets — you often eliminate foods for multiple consecutive days. The in-progress code discards this entirely in favor of single-date immediate edits, which is a fundamentally different (and less useful) interaction model. These approaches cannot be incrementally reconciled.

**Keep from in-progress work** (backend + services are UI-agnostic):
- ✅ API routes: `/api/food-categories`, `/api/food-logs`, `/api/food-logs/batch`, `/api/food-logs/[id]`, `/api/meals`, `/api/meals/[id]`
- ✅ Domain services: `food-tracking.service.ts`, `meal-logging.service.ts` (+ their tests)
- ✅ Stores: `food-log.svelte.ts` (committed), `calendar.svelte.ts` (new), `meals.svelte.ts` (new)
- ✅ DB adapter additions in `postgres.ts` (new repository methods)
- ✅ Repository port additions in `repository.ts`
- ✅ API type additions in `api.ts`
- ✅ i18n additions in `cs.ts`
- ✅ Integration tests: `food-categories-api.test.ts`, `food-logs-api.test.ts`, `meals-api.test.ts`
- ✅ Calendar utilities: `calendar.ts` + `calendar.test.ts` (overlap with prototype, keep the tested version)
- ✅ General components: `Toast.svelte`, `SyncStatusIndicator.svelte`

**Rewrite from in-progress work** (UI needs significant changes to match prototype):
- 🔄 `src/lib/components/calendar/CalendarHeader.svelte` — **keep as-is**, same prev/next + month name UI
- 🔄 `src/lib/components/calendar/SwipeContainer.svelte` — **keep as-is**, gesture handler is UI-agnostic
- 🔄 `src/lib/components/calendar/CalendarGrid.svelte` — **rewrite in place**: add range selection highlighting, two-color split dots, edit-mode day click behavior
- 🔄 `src/lib/components/calendar/DayCell.svelte` — **rewrite in place**: replace single-color tier dot with two-color split dot (elim + reintro), add range endpoint/in-range styling, inspected-date highlight
- ❌ `src/lib/components/food/FoodCategoryGrid.svelte` — **delete**: prototype uses vertical toggle list, not tile grid
- ❌ `src/lib/components/food/FoodCategoryTile.svelte` — **delete**: prototype uses toggle switches, not tiles
- ❌ `src/lib/components/food/FoodSubItemList.svelte` — **delete**: prototype has its own expandable sub-item pattern
- ❌ `src/lib/components/food/FoodSubItemToggle.svelte` — **delete**: prototype uses iOS-style switches, not cycling badges
- ❌ `src/lib/components/food/CopyFromYesterdayButton.svelte` — **delete**: not in prototype (may re-add later)
- 🫙 `src/lib/components/food/MealList.svelte` — **keep for later**: prototype has no meals, but these will be needed in a future step
- 🫙 `src/lib/components/food/MealCard.svelte` — **keep for later**
- 🫙 `src/lib/components/food/MealComposer.svelte` — **keep for later**
- 🫙 `src/lib/components/food/MealItemPicker.svelte` — **keep for later**
- 🔄 `src/routes/(app)/calendar/+page.svelte` — **rewrite** from prototype
- 🔄 `src/routes/(app)/food/+page.svelte` — **rewrite** to today-only read view

---

## Implementation Steps

### Step 0: Stabilize backend (keep as-is)

No changes needed. Verify these files are in good shape:

- `src/routes/api/food-categories/+server.ts`
- `src/routes/api/food-logs/+server.ts`, `batch/+server.ts`, `[id]/+server.ts`
- `src/routes/api/meals/+server.ts`, `[id]/+server.ts`
- `src/lib/adapters/postgres.ts` (modified — new methods)
- `src/lib/domain/ports/repository.ts` (modified — new interface methods)
- `src/lib/types/api.ts` (modified — new API types)
- `src/lib/i18n/cs.ts` (modified — new translations)
- `src/lib/stores/food-log.svelte.ts` (committed)
- `src/lib/stores/calendar.svelte.ts` (new)
- `src/lib/stores/meals.svelte.ts` (new)
- `src/lib/domain/services/food-tracking.service.ts` (new)
- `src/lib/domain/services/meal-logging.service.ts` (new)
- `src/lib/utils/calendar.ts` (new)
- `tests/integration/*.test.ts` (new)

### Step 1: Clean up UI components

**Delete** food components that use the wrong UI pattern (tile grid + cycling badges):
```
rm src/lib/components/food/FoodCategoryGrid.svelte
rm src/lib/components/food/FoodCategoryTile.svelte
rm src/lib/components/food/FoodSubItemList.svelte
rm src/lib/components/food/FoodSubItemToggle.svelte
rm src/lib/components/food/CopyFromYesterdayButton.svelte
```

**Keep as-is** (directly reusable):
- `src/lib/components/calendar/CalendarHeader.svelte`
- `src/lib/components/calendar/SwipeContainer.svelte`
- `Toast.svelte`, `SyncStatusIndicator.svelte`, `src/lib/components/index.ts`

**Keep for future meals feature** (not used yet, but not harmful):
- `MealList.svelte`, `MealCard.svelte`, `MealComposer.svelte`, `MealItemPicker.svelte`

**Rewrite in place** (structure salvageable, logic needs rework):
- `src/lib/components/calendar/CalendarGrid.svelte` — add range highlighting, two-color dots
- `src/lib/components/calendar/DayCell.svelte` — two-color split dot, range/inspected styling

Update `src/lib/components/food/index.ts` exports to remove deleted components.

### Step 2: Adapt the calendar store for edit mode

The existing `calendar.svelte.ts` store manages `year`, `month`, `selectedDate`. Extend it to support the prototype's edit mode state:

- Add `mode: 'view' | 'edit'`
- Add `rangeStart: string | null`, `rangeEnd: string | null`
- Add `actionMode: 'eliminate' | 'reintroduce'`
- Add `inspectedDate: string | null` (the date shown in view-mode detail card)
- Add derived: `sortedRange`, `rangeDayCount`, `isInRange(date)`, `isRangeEndpoint(date)`
- Add actions: `enterEditMode()`, `cancelEdit()`, `handleDayClick(date)`

### Step 3: Create a draft elimination store

New store: `src/lib/stores/draft-elimination.svelte.ts`

This encapsulates the prototype's draft editing pattern:

- `draftEliminated: Set<string>` — staged elimination keys (`categoryId` or `categoryId:subItemId`)
- `draftReintroduced: Set<string>` — staged reintroduction keys
- `committedElimSnapshot: Set<string>` — snapshot at edit start (for stable reintroduce filtering)
- `committedReintroSnapshot: Set<string>` — snapshot at edit start
- Methods: `initFromDate(date, foodLogs, categories)`, `toggleElim(key)`, `toggleReintro(key)`, `toggleGroupElim(category)`, `toggleGroupReintro(category)`, `isElim(key)`, `isReintro(key)`, `clear()`
- Derived: `catFullElim(cat)`, `catPartialElim(cat)`, `catFullReintro(cat)`, `catPartialReintro(cat)`, `snapshotCatRelevantForReintro(cat)`

### Step 4: Create a service function to convert draft → FoodLog entries

In `food-tracking.service.ts`, add:

```ts
function applyDraftToRange(
  draftEliminated: Set<string>,
  draftReintroduced: Set<string>,
  dateRange: string[],
  childId: string,
  createdBy: string
): FoodLog[]
```

This bridges the prototype's Set-based draft model to the domain's FoodLog model. For each date in the range, it generates the FoodLog entries that represent the draft state. The food-log store's `createBulkLogs` can then persist them.

### Step 5: Build the new calendar page

Rewrite `src/routes/(app)/calendar/+page.svelte` based on the prototype, but wired to real data:

**Structure** (single file, ~400-500 lines — the prototype is 615 lines with hardcoded data, production version replaces that with store/API calls):

1. **Script section**:
   - Import stores: `calendarStore`, `foodLogStore`, `mealsStore`, `childrenStore`, `authStore`, `draftEliminationStore`
   - Import utils: `getMonthDays`, `formatDateLong`, `formatShort`, `getTodayIso` from `$lib/utils/calendar`
   - `onMount`: Fetch `/api/food-categories` → populate `categories` state
   - `$effect`: When `year`/`month`/`activeChildId` changes → `foodLogStore.loadForDateRange()`
   - Wire up all prototype actions (`prevMonth`, `nextMonth`, `handleDayClick`, `enterEditMode`, `cancelEdit`, `saveAndExit`) but replace hardcoded data operations with store calls
   - `saveAndExit()`: Convert draft Sets → FoodLog entries via `applyDraftToRange()`, call `foodLogStore.createBulkLogs()`, show toast

2. **Template sections** (match prototype layout exactly):
   - **Sticky header**: View mode shows "Kalendář" + "Upravit" button; Edit mode shows "Zrušit" + action title + placeholder
   - **Calendar grid**: 7-column grid with weekday headers, day cells with two-color split dots
   - **View mode detail card**: Inline card below calendar (not a bottom sheet!) showing eliminated/reintroduced items for inspected date
   - **Edit mode controls**: Action mode toggle (Vyřadit/Zavést zpět), category list with iOS toggle switches, expandable sub-items
   - **Floating save bar**: Range display + save button, positioned above bottom nav
   - **Toast**: Reuse existing `Toast.svelte`

3. **Key mapping from prototype hardcoded data → real data**:
   - `CATEGORIES` array → fetched from `/api/food-categories` (shape: `FoodCategory[]` with `.nameCs`, `.icon`, `.subItems`)
   - `dataByDate` (per-date Sets) → derived from `foodLogStore.logs` using `food-tracking.service.ts` helpers
   - `dateElimCount(date)` → use `countActiveEliminations()` from service, but also add `countActiveReintroductions()` for the two-color dots
   - `dateEliminatedItems(date)` / `dateReintroducedItems(date)` → filter categories by FoodLog status using `getFoodStatus()`
   - Draft toggle functions → delegate to `draftEliminationStore`

### Step 6: Adapt helper functions in food-tracking service

The prototype uses `Set<string>` keys like `"dairy:milk"` or `"eggs"`. The real data model uses `FoodLog` records with `categoryId` + optional `subItemId`. Add bridging utilities:

- `buildStatusSets(logs: FoodLog[], date: string, categories: FoodCategory[]): { eliminated: Set<string>, reintroduced: Set<string> }` — converts FoodLog array for a given date into the prototype's Set format
- `countActiveReintroductions(logs, date, allCategoryIds): number` — mirror of `countActiveEliminations` for the green dots
- `getCategoriesWithStatus(logs, date, categories, status: 'eliminated' | 'reintroduced'): FoodCategory[]` — returns categories matching a given status for the view-mode detail card

### Step 7: Add i18n entries for new UI elements

Check `cs.ts` for any missing translations needed by the prototype UI:

- `calendar.edit` → "Upravit"
- `calendar.cancel` → "Zrušit"
- `calendar.save` → "Uložit"
- `calendar.eliminate` → "Vyřadit"
- `calendar.reintroduce` → "Zavést zpět"
- `calendar.selectEnd` → "Klepněte na druhý den pro konec"
- `calendar.selectStart` → "Klepněte na den pro začátek období"
- `calendar.noRecords` → "Žádné záznamy"
- `calendar.saved` → "Uloženo"
- `calendar.savedForDays` → "Uloženo pro {count} {dayPlural}"
- `calendar.nothingToReintroduce` → "Žádné vyřazené potraviny k znovuzavedení"
- `calendar.elimination` → "Vyřazení" (header in edit mode)
- `calendar.reintroduction` → "Znovuzavedení" (header in edit mode)

Many of these may already exist — check before adding.

### Step 8: Update the food tab page

The food page (`src/routes/(app)/food/+page.svelte`) should become a "today quick view" that shows today's elimination status and provides a shortcut to the calendar's edit mode. This is a simplified read-only view:

- Show today's date
- Show eliminated/reintroduced items for today (using same card layout as calendar view-mode detail)
- "Upravit v kalendáři" link/button that navigates to the calendar tab
- No inline editing on this page — the calendar is the single source of truth for editing

### Step 9: Handle the "no child" empty state

Keep the empty state pattern from the in-progress code — when `activeChildId` is null, show "Nejprve přidejte dítě" with a link to settings. This is straightforward and needed regardless of UI approach.

### Step 10: Swipe gesture support

The prototype doesn't include swipe gestures (it uses prev/next buttons). For mobile UX, add touch handling directly in the calendar page:

- Detect horizontal swipe on the calendar grid area
- Left swipe → next month, right swipe → previous month
- Only in view mode (in edit mode, swipe might conflict with range selection)
- Simple implementation: `touchstart`/`touchend` listeners with 50px threshold (same logic as the discarded `SwipeContainer`, but inline)

### Step 11: Wire up "Copy from yesterday" into edit mode

The prototype doesn't have copy-from-yesterday, but the service function exists. Add it as an optional enhancement:

- In edit mode, when initializing the draft for a date with no data, offer "Zkopírovat ze včerejška" button
- This pre-populates the draft Sets from the previous day's committed data
- Uses `copyFromYesterday()` from `food-tracking.service.ts`

**This step is optional and can be deferred.**

### Step 12: Update docs and test coverage map

- Update `docs/phases/phase-2-food-tracker.md` acceptance criteria
- Update `docs/architecture/test-coverage-map.md`
- Mark completed items in phase doc

---

## File change summary

| Action | File | Reason |
|---|---|---|
| **KEEP** | `src/lib/components/calendar/CalendarHeader.svelte` | Same UI as prototype |
| **KEEP** | `src/lib/components/calendar/SwipeContainer.svelte` | UI-agnostic gesture handler |
| **REWRITE** | `src/lib/components/calendar/CalendarGrid.svelte` | Add range highlighting, two-color dots |
| **REWRITE** | `src/lib/components/calendar/DayCell.svelte` | Two-color split dot, range/inspected styling |
| **DELETE** | `src/lib/components/food/{FoodCategoryGrid,Tile,SubItemList,SubItemToggle,CopyFromYesterday}` | Tile/badge UI doesn't match prototype's toggle switches |
| **KEEP** | `src/lib/components/food/{MealList,MealCard,MealComposer,MealItemPicker}` | Not used now, needed for future meals feature |
| **REWRITE** | `src/routes/(app)/calendar/+page.svelte` | Rebuild from prototype with real data |
| **REWRITE** | `src/routes/(app)/food/+page.svelte` | Simplify to today-only read view |
| **EXTEND** | `src/lib/stores/calendar.svelte.ts` | Add edit mode, range selection state |
| **CREATE** | `src/lib/stores/draft-elimination.svelte.ts` | Draft editing pattern for Set-based toggles |
| **EXTEND** | `src/lib/domain/services/food-tracking.service.ts` | Add `applyDraftToRange`, `buildStatusSets`, `countActiveReintroductions` |
| **EXTEND** | `src/lib/i18n/cs.ts` | Add missing edit-mode translations |
| **KEEP** | All API routes, stores, integration tests, utils | Backend is UI-agnostic |
| **KEEP** | `Toast.svelte`, `SyncStatusIndicator.svelte` | Reusable across both approaches |

## Risk notes

- The prototype uses hardcoded `Set<string>` keys (`"dairy:milk"`). Real data uses UUID-based `categoryId` + `subItemId` from the database. The key format needs to use real IDs: `key(categoryId, subItemId)`.
- The prototype pre-populates April 2026 with demo data. The real app starts empty — make sure the "no data" empty states look good.
- Range-based bulk saving could create many FoodLog records. The batch API endpoint (`/api/food-logs/batch`) already exists for this.
- The prototype doesn't handle loading states or API errors. Add minimal loading/error UI.
