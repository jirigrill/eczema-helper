<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { createDayView } from '$lib/stores/day-view.svelte';
  import { getEligibleActors } from '$lib/domain/models';
  import { todayIso, formatDateLongCs, formatObservationTime } from '$lib/utils/date';
  import { computeDayStrip } from '$lib/components/DayStrip/day-strip';
  import DayStrip from '$lib/components/DayStrip/DayStrip.svelte';
  import { dayStripRecentreSignal, pulseRecentreDayStrip } from '$lib/stores/day-strip-recentre';
  import SkinObservationCard from '$lib/components/SkinObservationCard.svelte';
  import SkinPhotoCard from '$lib/components/SkinPhotoCard.svelte';
  import MealCard from '$lib/components/MealCard.svelte';
  import SettingsIcon from '$lib/components/icons/SettingsIcon.svelte';
  import { commonStrings } from '$lib/strings/common';

  const today = todayIso();
  // The `[date]` route param is always present; fall back to today only to
  // satisfy the `() => string` contract when the type says `string | undefined`.
  const view = createDayView(() => page.params.date ?? today, today);

  $effect(() => {
    if (view.redirectTo) goto(`/day/${view.redirectTo}`, { replaceState: true });
  });

  const meals = $derived(view.meals);
  const skinObservations = $derived(view.observations);
  const photos = $derived(view.photos);
  const observationTimes = $derived(
    new Map(skinObservations.map((o) => [o.id, formatObservationTime(o.createdAt)])),
  );
  const selectedDate = $derived(view.selectedDate);

  // Who may log at the current feeding stage (#567/#570). `breastfed → [mother]`,
  // `mixed → [mother, baby]`, `solids → [baby]`. Drives MealCard's single-actor
  // collapse vs. stacked per-actor rows.
  const eligibleActors = $derived(view.feedingStage ? getEligibleActors(view.feedingStage) : []);

  const isToday = $derived(selectedDate === today);

  const dayStrip = $derived(
    computeDayStrip({
      selectedDate,
      earliestLogged: view.earliestLogged,
      today,
    }),
  );

  // Imperative handle into the DayStrip — the "↩ Dnes" header chip pulses a
  // signal store when tapped, and we forward it to the strip so it recentres
  // on today even when the route param did not change.
  let dayStripRef: { recentre: () => void } | undefined = $state();
  $effect(() => {
    void $dayStripRecentreSignal;
    dayStripRef?.recentre();
  });

  function handleSelectDate(date: string): void {
    goto(`/day/${date}`);
  }

  // The "↩ Dnes" chip returns the browser to today and recentres the strip
  // (PRD #623, §3). It rides the header's existing `isToday` swap, so no new
  // visibility rule enters the code. Pulsing the recentre signal covers the
  // case where the strip was scrolled off today even though the route changes.
  function handleBackToToday(): void {
    pulseRecentreDayStrip();
    goto(`/day/${today}`);
  }
</script>

<div class="mx-auto max-w-lg">
  <!-- Header -->
  <div class="flex items-end justify-between px-4 pt-4 pb-2">
    <div>
      {#if isToday}
        <div class="eyebrow">{formatDateLongCs(selectedDate)}</div>
        <h2 class="page-heading">{commonStrings.today.heading}</h2>
      {:else}
        <h2 class="page-heading">{formatDateLongCs(selectedDate)}</h2>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      {#if !isToday}
        <button
          type="button"
          data-testid="back-to-today-chip"
          class="border-surface-dark text-primary rounded-full border bg-white px-3 py-1 text-[12px] font-semibold"
          onclick={handleBackToToday}
        >
          {commonStrings.nav.backToToday}
        </button>
      {/if}
      <a
        href="/settings"
        class="text-text-muted -mr-1.5 p-1.5"
        aria-label={commonStrings.today.settingsAria}
      >
        <SettingsIcon class="h-5 w-5" />
      </a>
    </div>
  </div>

  <!-- DayStrip -->
  <DayStrip
    bind:this={dayStripRef}
    cells={dayStrip.cells}
    {today}
    onselectdate={handleSelectDate}
  />

  <div class="space-y-3 px-4 pb-24">
    <!-- Skin observation card -->
    <SkinObservationCard observations={skinObservations} date={selectedDate} />

    <!-- Skin photo card -->
    <SkinPhotoCard {photos} {observationTimes} />

    <!-- Meal card -->
    <MealCard date={selectedDate} {meals} {eligibleActors} />

    <!-- Bottom hint -->
    <div class="text-text-muted/70 mt-2 flex items-center justify-center gap-2 text-[11px]">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="rotate-180"
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      <span>{commonStrings.today.recordHint}</span>
    </div>
  </div>
</div>
