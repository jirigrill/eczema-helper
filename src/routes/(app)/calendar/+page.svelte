<script lang="ts">
  import { CalendarHeader, CalendarGrid, SwipeContainer } from '$lib/components/calendar';
  import Toast from '$lib/components/Toast.svelte';
  import { calendarStore } from '$lib/stores/calendar.svelte';
  import { draftEliminationStore } from '$lib/stores/draft-elimination.svelte';
  import { foodLogStore } from '$lib/stores/food-log.svelte';
  import { childrenStore } from '$lib/stores/children.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { formatDateLong, formatDateShort, getTodayIso, getMonthDays } from '$lib/utils/calendar';
  import {
    buildStatusSets,
    applyDraftDiffToRange,
    getDatesInRange,
    getEliminatedCategories,
    getReintroducedCategories,
    getPreviousDate,
  } from '$lib/domain/services/food-tracking.service';
  import type { FoodCategory } from '$lib/domain/models';
  import { onMount } from 'svelte';
  import { cs } from '$lib/i18n/cs';

  // ── Data ───────────────────────────────────────────────────

  let categories = $state<FoodCategory[]>([]);
  let toast = $state<{ message: string } | null>(null);

  const year = $derived(calendarStore.year);
  const month = $derived(calendarStore.month);
  const mode = $derived(calendarStore.mode);
  const inspectedDate = $derived(calendarStore.inspectedDate);
  const rangeStart = $derived(calendarStore.rangeStart);
  const rangeEnd = $derived(calendarStore.rangeEnd);
  const actionMode = $derived(calendarStore.actionMode);
  const foodLogs = $derived(foodLogStore.logs);
  const activeChildId = $derived(childrenStore.activeChildId);
  const categoryIds = $derived(categories.map((c) => c.id));
  const expandedCategoryId = $derived(draftEliminationStore.expandedCategoryId);

  // Color scheme derived from action mode
  const isReintroMode = $derived(mode === 'edit' && actionMode === 'reintroduce');
  const accentBg = $derived(isReintroMode ? 'bg-[#4A7C6F]' : 'bg-primary');
  const accentBgLight = $derived(isReintroMode ? 'bg-[#4A7C6F]/15' : 'bg-primary/15');
  const accentText = $derived(isReintroMode ? 'text-[#4A7C6F]' : 'text-primary');
  const toggleOnBg = $derived(isReintroMode ? 'bg-[#4A7C6F] border-[#4A7C6F]' : 'bg-primary border-primary');
  const toggleOnPartial = $derived(isReintroMode ? 'bg-[#4A7C6F]/30 border-[#4A7C6F]/50' : 'bg-primary/30 border-primary/50');
  const toggleRowActive = $derived(isReintroMode ? 'border-[#4A7C6F]/40 bg-[#4A7C6F]/5' : 'border-primary/40 bg-primary/5');
  const toggleRowPartial = $derived(isReintroMode ? 'border-[#4A7C6F]/20' : 'border-primary/20');

  // Range helpers
  const sortedRange = $derived(calendarStore.getSortedRange());
  const rangeDayCount = $derived.by(() => {
    if (!sortedRange || !rangeEnd) return 0;
    return Math.round(
      (new Date(sortedRange.end + 'T00:00:00').getTime() -
        new Date(sortedRange.start + 'T00:00:00').getTime()) /
        86400000
    ) + 1;
  });

  // View-mode detail card data
  const viewDate = $derived(inspectedDate ?? getTodayIso());
  const viewEliminated = $derived(getEliminatedCategories(foodLogs, viewDate, categories));
  const viewReintroduced = $derived(getReintroducedCategories(foodLogs, viewDate, categories));

  // Edit-mode filtered categories
  const visibleCategories = $derived(
    actionMode === 'reintroduce'
      ? categories.filter((c) => draftEliminationStore.snapshotCatRelevantForReintro(c))
      : categories
  );

  // ── Load data ──────────────────────────────────────────────

  onMount(async () => {
    try {
      const res = await fetch('/api/food-categories');
      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          categories = json.data;
        }
      }
    } catch {
      // Categories will be empty — show loading state
    }
  });

  $effect(() => {
    if (activeChildId) {
      const days = getMonthDays(year, month);
      const startDate = days[0].date;
      const endDate = days[days.length - 1].date;
      foodLogStore.loadForDateRange(activeChildId, startDate, endDate);
    }
  });

  // ── Actions ────────────────────────────────────────────────

  function handlePrevMonth() {
    calendarStore.navigateMonth(-1);
  }

  function handleNextMonth() {
    calendarStore.navigateMonth(1);
  }

  function handleToday() {
    const today = new Date();
    calendarStore.goToDate(getTodayIso());
  }

  function handleDayClick(date: string) {
    calendarStore.handleDayClick(date);
  }

  function enterEditMode() {
    const startDate = inspectedDate ?? getTodayIso();
    calendarStore.enterEditMode();

    // Build draft from existing food log data
    const prevDate = getPreviousDate(startDate);
    const sourceData = buildStatusSets(foodLogs, startDate, categories);
    const prevData = buildStatusSets(foodLogs, prevDate, categories);

    // Use selected day's data if it has any, otherwise inherit from previous day
    const hasData = sourceData.eliminated.size > 0 || sourceData.reintroduced.size > 0;
    const seed = hasData ? sourceData : prevData;
    draftEliminationStore.initFromSets(seed.eliminated, seed.reintroduced);
  }

  function cancelEdit() {
    calendarStore.cancelEdit();
    draftEliminationStore.clear();
  }

  async function saveAndExit() {
    if (!sortedRange || !activeChildId || !authStore.user) return;

    const dates = getDatesInRange(sortedRange.start, sortedRange.end);
    const entries = applyDraftDiffToRange(
      draftEliminationStore.draftEliminated,
      draftEliminationStore.draftReintroduced,
      draftEliminationStore.committedElimSnapshot,
      draftEliminationStore.committedReintroSnapshot,
      dates,
      activeChildId,
      authStore.user.id
    );

    if (entries.length > 0) {
      await foodLogStore.createBulkLogs(entries);
    }

    const count = rangeDayCount;
    const focusDate = sortedRange.end;
    const dayWord = dayPlural(count);
    toast = { message: count > 0 ? `Uloženo pro ${count} ${dayWord}` : cs.save };
    setTimeout(() => { toast = null; }, 2000);

    calendarStore.exitEditMode(focusDate);
    draftEliminationStore.clear();
  }

  // ── Toggle helpers ─────────────────────────────────────────

  function isToggleOn(cat: FoodCategory): boolean {
    return actionMode === 'eliminate'
      ? draftEliminationStore.catFullElim(cat)
      : draftEliminationStore.catFullReintro(cat);
  }

  function isTogglePartial(cat: FoodCategory): boolean {
    if (actionMode === 'eliminate') {
      return !draftEliminationStore.catFullElim(cat) && draftEliminationStore.catPartialElim(cat);
    }
    return !draftEliminationStore.catFullReintro(cat) && draftEliminationStore.catPartialReintro(cat);
  }

  function isSubToggleOn(catId: string, siId: string): boolean {
    return actionMode === 'eliminate'
      ? draftEliminationStore.isElim(catId, siId)
      : draftEliminationStore.isReintro(catId, siId);
  }

  function handleGroupToggle(cat: FoodCategory) {
    if (actionMode === 'eliminate') {
      draftEliminationStore.toggleGroupElim(cat);
    } else {
      draftEliminationStore.toggleGroupReintro(cat);
    }
  }

  function handleSubToggle(catId: string, siId: string) {
    if (actionMode === 'eliminate') {
      draftEliminationStore.toggleElim(catId, siId);
    } else {
      draftEliminationStore.toggleReintro(catId, siId);
    }
  }

  function dayPlural(n: number): string {
    if (n === 1) return 'den';
    if (n >= 2 && n <= 4) return 'dny';
    return 'dní';
  }
</script>

{#if authStore.loading}
  <!-- Loading: wait for auth/child data to avoid flash -->
{:else if !activeChildId}
  <!-- Empty state: no child -->
  <div class="flex-1 flex items-center justify-center p-8 text-center">
    <div>
      <p class="text-lg text-text-muted mb-2">{cs.addChildFirst}</p>
      <a href="/settings" class="text-primary underline">{cs.goToSettings}</a>
    </div>
  </div>
{:else}
  <div class="min-h-screen" style:padding-bottom={mode === 'edit' ? 'calc(4.5rem + 3.5rem + var(--safe-area-inset-bottom))' : '0'}>

    <!-- Edit mode header — overlays layout header -->
    {#if mode === 'edit'}
      <div class="sticky top-0 z-50 bg-white border-b border-surface-dark px-4 py-2 flex items-center gap-2">
        <button
          type="button"
          class="text-sm text-text-muted font-medium px-3 py-1.5 rounded-lg hover:bg-surface transition-colors"
          onclick={cancelEdit}
        >{cs.cancel}</button>
        <h1 class="text-base font-semibold flex-1 text-center {accentText}">
          {actionMode === 'eliminate' ? 'Vyřazení' : 'Znovuzavedení'}
        </h1>
        <div class="w-16"></div>
      </div>
    {/if}

    <!-- Calendar -->
    <div class="px-2 pt-1">
      {#if mode === 'view'}
        <div class="flex justify-end px-2 pt-1">
          <button
            type="button"
            class="flex items-center gap-1.5 text-sm text-primary font-medium px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
            onclick={enterEditMode}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            {cs.edit}
          </button>
        </div>
      {/if}
      <SwipeContainer onSwipeLeft={handleNextMonth} onSwipeRight={handlePrevMonth}>
        <CalendarHeader
          {year}
          {month}
          onPrev={handlePrevMonth}
          onNext={handleNextMonth}
          onToday={handleToday}
        />
        <CalendarGrid
          {year}
          {month}
          {foodLogs}
          {categoryIds}
          {categories}
          {inspectedDate}
          {mode}
          {accentBg}
          {accentBgLight}
          {accentText}
          isInRange={(date) => calendarStore.isInRange(date)}
          isRangeEndpoint={(date) => calendarStore.isRangeEndpoint(date)}
          onSelectDate={handleDayClick}
        />
      </SwipeContainer>
    </div>

    <!-- ═══════ VIEW MODE — Day detail card ═══════ -->
    {#if mode === 'view'}
      <div class="mx-3 mt-2 mb-3 bg-white rounded-xl border border-surface-dark overflow-hidden {inspectedDate ? 'animate-fadeIn' : ''}">
        <div class="flex items-center justify-between px-4 pt-3 pb-2">
          <h3 class="text-sm font-semibold text-text">
            {inspectedDate ? formatDateLong(inspectedDate) : cs.today}
          </h3>
          {#if inspectedDate}
            <button
              type="button"
              class="p-1 text-text-muted hover:text-text"
              onclick={() => calendarStore.setInspectedDate(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>

        {#if viewEliminated.length === 0 && viewReintroduced.length === 0}
          <div class="px-4 pb-4 text-sm text-text-muted">Žádné záznamy</div>
        {:else}
          {#if viewEliminated.length > 0}
            <div class="px-4 pb-2">
              <p class="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1.5">{cs.eliminated}</p>
              <div class="space-y-0.5">
                {#each viewEliminated as cat (cat.id)}
                  <div class="flex items-center gap-2 py-1">
                    <span class="text-base">{cat.icon}</span>
                    <span class="text-sm text-text">{cat.nameCs}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
          {#if viewReintroduced.length > 0}
            <div class="px-4 pb-3 {viewEliminated.length > 0 ? 'pt-2 border-t border-surface-dark mt-2' : ''}">
              <p class="text-[10px] uppercase tracking-wider text-[#4A7C6F] font-semibold mb-1.5">{cs.reintroduced}</p>
              <div class="space-y-0.5">
                {#each viewReintroduced as cat (cat.id)}
                  <div class="flex items-center gap-2 py-1">
                    <span class="text-base">{cat.icon}</span>
                    <span class="text-sm text-text">{cat.nameCs}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {/if}
      </div>

    <!-- ═══════ EDIT MODE — Range + toggles ═══════ -->
    {:else}
      {#if !rangeStart}
        <div class="mx-4 mt-3 text-xs text-text-muted text-center">Klepněte na den pro začátek období</div>
      {:else if !rangeEnd}
        <div class="mx-4 mt-3 text-xs {accentText} text-center font-medium">Klepněte na druhý den pro konec</div>
      {/if}

      <!-- Action mode toggle -->
      <div class="flex gap-1 mx-3 mt-3 p-0.5 bg-surface-dark rounded-lg">
        <button
          type="button"
          class="flex-1 py-1.5 rounded-md text-xs font-medium transition-colors {actionMode === 'eliminate' ? 'bg-primary text-white shadow-sm' : 'text-text-muted'}"
          onclick={() => calendarStore.setActionMode('eliminate')}
        >Vyřadit</button>
        <button
          type="button"
          class="flex-1 py-1.5 rounded-md text-xs font-medium transition-colors {actionMode === 'reintroduce' ? 'bg-[#4A7C6F] text-white shadow-sm' : 'text-text-muted'}"
          onclick={() => calendarStore.setActionMode('reintroduce')}
        >Zavést zpět</button>
      </div>

      <!-- Category toggle list -->
      {#if actionMode === 'reintroduce' && visibleCategories.length === 0}
        <div class="mx-4 mt-4 text-sm text-text-muted text-center">Žádné vyřazené potraviny k znovuzavedení</div>
      {/if}
      <div class="mt-2 mx-3 space-y-1">
        {#each visibleCategories as cat (cat.id)}
          {@const on = isToggleOn(cat)}
          {@const partial = isTogglePartial(cat)}
          {@const isExpanded = expandedCategoryId === cat.id}

          <div class="rounded-xl border overflow-hidden transition-colors
            {on ? toggleRowActive : partial ? toggleRowPartial : 'border-surface-dark bg-white'}">
            <div class="flex items-center gap-2 px-3 py-2">
              {#if cat.subItems.length > 0}
                <button
                  type="button"
                  class="flex items-center gap-2 flex-1 min-w-0"
                  onclick={() => draftEliminationStore.toggleExpand(cat.id)}
                >
                  <span class="text-lg flex-none">{cat.icon}</span>
                  <span class="text-sm font-medium text-text truncate">{cat.nameCs}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-text-muted flex-none transition-transform {isExpanded ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              {:else}
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <span class="text-lg flex-none">{cat.icon}</span>
                  <span class="text-sm font-medium text-text truncate">{cat.nameCs}</span>
                </div>
              {/if}
              <button
                type="button"
                class="flex-none h-7 w-12 rounded-full border-2 transition-colors flex items-center px-0.5
                  {on ? `${toggleOnBg} justify-end` : partial ? `${toggleOnPartial} justify-end` : 'bg-surface-dark border-surface-dark justify-start'}"
                onclick={() => handleGroupToggle(cat)}
              >
                <span class="block h-5 w-5 rounded-full bg-white shadow-sm"></span>
              </button>
            </div>

            {#if isExpanded && cat.subItems.length > 0}
              <div class="border-t border-surface-dark bg-surface/50">
                {#each cat.subItems as si (si.id)}
                  {#if actionMode === 'eliminate' || draftEliminationStore.snapshotSubRelevantForReintro(cat.id, si.id)}
                    {@const siOn = isSubToggleOn(cat.id, si.id)}
                    <div class="flex items-center gap-2 px-3 py-1.5 pl-10">
                      <span class="text-sm text-text flex-1 truncate">{si.nameCs}</span>
                      <button
                        type="button"
                        class="flex-none h-6 w-10 rounded-full border-2 transition-colors flex items-center px-0.5
                          {siOn ? `${toggleOnBg} justify-end` : 'bg-surface-dark border-surface-dark justify-start'}"
                        onclick={() => handleSubToggle(cat.id, si.id)}
                      >
                        <span class="block h-4 w-4 rounded-full bg-white shadow-sm"></span>
                      </button>
                    </div>
                  {/if}
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
      <div class="h-4"></div>
    {/if}
  </div>

  <!-- Floating Save Bar -->
  {#if mode === 'edit'}
    <div class="fixed left-0 right-0 z-40 px-3 pb-1" style="bottom: calc(3.5rem + var(--safe-area-inset-bottom));">
      <div class="rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 border bg-white
        {isReintroMode ? 'border-[#4A7C6F]/30' : 'border-primary/30'}">
        <div class="flex-1 text-xs text-text-muted min-w-0">
          {#if sortedRange && rangeEnd}
            <span class="font-medium text-text">{formatDateShort(sortedRange.start)} – {formatDateShort(sortedRange.end)}</span>
            <span class="ml-1">({rangeDayCount} {dayPlural(rangeDayCount)})</span>
          {:else if rangeStart}
            <span class="font-medium text-text">{formatDateShort(rangeStart)}</span>
            <span class="ml-1">— vyberte konec</span>
          {:else}
            <span>Vyberte období</span>
          {/if}
        </div>
        <button
          type="button"
          class="flex-none text-white text-sm font-medium rounded-lg px-5 py-2 min-h-[44px] transition-all
            {isReintroMode ? 'bg-[#4A7C6F]' : 'bg-primary'}
            {rangeStart ? '' : 'opacity-40 pointer-events-none'}"
          onclick={saveAndExit}
          disabled={!rangeStart}
        >
          {cs.save}
        </button>
      </div>
    </div>
  {/if}
{/if}

<!-- Toast -->
{#if toast}
  <div class="fixed left-4 right-4 z-50 animate-slideUp" style="bottom: calc(3.5rem + var(--safe-area-inset-bottom) + 5rem);">
    <div class="bg-[#4A7C6F]/90 text-white rounded-lg px-4 py-3 flex items-center gap-2 shadow-lg">
      <span>✓</span>
      <span class="text-sm">{toast.message}</span>
    </div>
  </div>
{/if}

<style>
  @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
  .animate-slideUp { animation: slideUp 0.2s ease-out; }
  .animate-fadeIn { animation: fadeIn 0.15s ease-out; }
</style>
