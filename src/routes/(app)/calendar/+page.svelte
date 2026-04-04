<script lang="ts">
  import {
    CalendarHeader, CalendarGrid, SwipeContainer,
    DayDetailCard, EditModeToggles, FloatingSaveBar,
  } from '$lib/components/calendar';
  import Toast from '$lib/components/Toast.svelte';
  import { calendarStore } from '$lib/stores/calendar.svelte';
  import { draftEliminationStore } from '$lib/stores/draft-elimination.svelte';
  import { foodLogStore } from '$lib/stores/food-log.svelte';
  import { childrenStore } from '$lib/stores/children.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { getTodayIso, getMonthDays } from '$lib/utils/calendar';
  import {
    applyDraftToRange,
    getDatesInRange,
    buildExactDateStatusSets,
    getExactDateEliminatedDetails,
    getExactDateReintroducedDetails,
  } from '$lib/domain/services/food-tracking.service';
  import type { FoodCategory } from '$lib/domain/models';
  import { onMount } from 'svelte';
  import { cs } from '$lib/i18n/cs';

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

  const isReintroMode = $derived(mode === 'edit' && actionMode === 'reintroduce');
  const accentBg = $derived(isReintroMode ? 'bg-[#4A7C6F]' : 'bg-primary');
  const accentBgLight = $derived(isReintroMode ? 'bg-[#4A7C6F]/15' : 'bg-primary/15');
  const accentText = $derived(isReintroMode ? 'text-[#4A7C6F]' : 'text-primary');
  const toggleOnBg = $derived(isReintroMode ? 'bg-[#4A7C6F] border-[#4A7C6F]' : 'bg-primary border-primary');
  const toggleOnPartial = $derived(isReintroMode ? 'bg-[#4A7C6F]/30 border-[#4A7C6F]/50' : 'bg-primary/30 border-primary/50');
  const toggleRowActive = $derived(isReintroMode ? 'border-[#4A7C6F]/40 bg-[#4A7C6F]/5' : 'border-primary/40 bg-primary/5');
  const toggleRowPartial = $derived(isReintroMode ? 'border-[#4A7C6F]/20' : 'border-primary/20');

  const sortedRange = $derived(calendarStore.getSortedRange());
  const rangeDayCount = $derived.by(() => {
    if (!sortedRange) return rangeStart ? 1 : 0;
    return Math.round(
      (new Date(sortedRange.end + 'T00:00:00').getTime() -
        new Date(sortedRange.start + 'T00:00:00').getTime()) /
        86400000
    ) + 1;
  });

  const viewDate = $derived(inspectedDate ?? getTodayIso());
  const viewEliminated = $derived(getExactDateEliminatedDetails(foodLogs, viewDate, categories));
  const viewReintroduced = $derived(getExactDateReintroducedDetails(foodLogs, viewDate, categories));

  const visibleCategories = $derived(
    actionMode === 'reintroduce'
      ? categories.filter((c) => draftEliminationStore.snapshotCatRelevantForReintro(c))
      : categories
  );

  onMount(async () => {
    try {
      const res = await fetch('/api/food-categories');
      if (res.ok) {
        const json = await res.json();
        if (json.ok) categories = json.data;
      }
    } catch {
      // Categories will be empty — show loading state
    }
  });

  $effect(() => {
    if (activeChildId) {
      const days = getMonthDays(year, month);
      foodLogStore.loadForDateRange(activeChildId, days[0].date, days[days.length - 1].date);
    }
  });

  function enterEditMode() {
    const startDate = inspectedDate ?? getTodayIso();
    calendarStore.enterEditMode();
    const { eliminated, reintroduced } = buildExactDateStatusSets(foodLogs, startDate, categories);
    draftEliminationStore.initFromSets(eliminated, reintroduced);
  }

  function cancelEdit() {
    calendarStore.cancelEdit();
    draftEliminationStore.clear();
  }

  async function saveAndExit() {
    if (!sortedRange || !activeChildId || !authStore.user) return;

    const dates = getDatesInRange(sortedRange.start, sortedRange.end);
    const entries = applyDraftToRange(
      draftEliminationStore.draftEliminated,
      draftEliminationStore.draftReintroduced,
      dates,
      activeChildId,
      authStore.user.id
    );

    await foodLogStore.replaceLogsForDates(activeChildId, dates, entries);

    function dayPlural(n: number): string {
      if (n === 1) return 'den';
      if (n >= 2 && n <= 4) return 'dny';
      return 'dní';
    }

    const count = rangeDayCount;
    toast = { message: count > 0 ? `Uloženo pro ${count} ${dayPlural(count)}` : cs.save };
    setTimeout(() => { toast = null; }, 2000);

    calendarStore.exitEditMode(sortedRange.end);
    draftEliminationStore.clear();
  }
</script>

{#if authStore.loading}
  <!-- Loading: wait for auth/child data to avoid flash -->
{:else if !activeChildId}
  <div class="flex-1 flex items-center justify-center p-8 text-center">
    <div>
      <p class="text-lg text-text-muted mb-2">{cs.addChildFirst}</p>
      <a href="/settings" class="text-primary underline">{cs.goToSettings}</a>
    </div>
  </div>
{:else}
  <div class="min-h-screen" style:padding-bottom={mode === 'edit' ? 'calc(4.5rem + 3.5rem + var(--safe-area-inset-bottom))' : '0'}>

    {#if mode === 'edit'}
      <div class="sticky top-0 z-50 bg-white border-b border-surface-dark px-4 py-2 flex items-center gap-2">
        <button type="button" class="text-sm text-text-muted font-medium px-3 py-1.5 rounded-lg hover:bg-surface transition-colors" onclick={cancelEdit}>{cs.cancel}</button>
        <h1 class="text-base font-semibold flex-1 text-center {accentText}">
          {actionMode === 'eliminate' ? cs.elimination : cs.reintroduction}
        </h1>
        <div class="w-16"></div>
      </div>
    {/if}

    <div class="px-2 pt-1">
      {#if mode === 'view'}
        <div class="flex justify-end px-2 pt-1">
          <button type="button" class="flex items-center gap-1.5 text-sm text-primary font-medium px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors" onclick={enterEditMode}>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            {cs.edit}
          </button>
        </div>
      {/if}
      <SwipeContainer onSwipeLeft={() => calendarStore.navigateMonth(1)} onSwipeRight={() => calendarStore.navigateMonth(-1)}>
        <CalendarHeader {year} {month} onPrev={() => calendarStore.navigateMonth(-1)} onNext={() => calendarStore.navigateMonth(1)} onToday={() => calendarStore.goToDate(getTodayIso())} />
        <CalendarGrid {year} {month} {foodLogs} {inspectedDate} {mode} {accentBg} {accentBgLight} {accentText} isInRange={(d) => calendarStore.isInRange(d)} isRangeEndpoint={(d) => calendarStore.isRangeEndpoint(d)} onSelectDate={(d) => calendarStore.handleDayClick(d)} />
      </SwipeContainer>
    </div>

    {#if mode === 'view'}
      <DayDetailCard {inspectedDate} eliminated={viewEliminated} reintroduced={viewReintroduced} onClose={() => calendarStore.setInspectedDate(null)} />
    {:else}
      <EditModeToggles {actionMode} {visibleCategories} {rangeStart} {rangeEnd} {accentText} {toggleOnBg} {toggleOnPartial} {toggleRowActive} {toggleRowPartial} onSetActionMode={(m) => calendarStore.setActionMode(m)} />
    {/if}
  </div>

  {#if mode === 'edit'}
    <FloatingSaveBar {rangeStart} {rangeEnd} {sortedRange} {rangeDayCount} {isReintroMode} onSave={saveAndExit} />
  {/if}
{/if}

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
  .animate-slideUp { animation: slideUp 0.2s ease-out; }
</style>
