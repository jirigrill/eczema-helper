<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { createDayView } from '$lib/stores/day-view.svelte';
  import { evaluationsStore } from '$lib/stores/evaluations-store';
  import { evaluationHrefForPhase } from '$lib/config/evaluation';
  import { getToleranceBuildingRemindersForDate } from '$lib/domain/schedule-builder';
  import { dailyCompleteness } from '$lib/domain/day-view';
  import { BundledCatalogAdapter } from '$lib/adapters/bundled-catalog-adapter';
  import { todayIso, formatDateLongCs, formatObservationTime } from '$lib/utils/date';
  import { computeDayStrip } from '$lib/components/DayStrip/day-strip';
  import DayStrip from '$lib/components/DayStrip/DayStrip.svelte';
  import { dayStripRecentreSignal } from '$lib/stores/day-strip-recentre';
  import ErrorAlert from '$lib/components/error-alert.svelte';
  import SkinObservationCard from '$lib/components/SkinObservationCard.svelte';
  import SkinPhotoCard from '$lib/components/SkinPhotoCard.svelte';
  import MealCard from '$lib/components/MealCard.svelte';
  import AllergenChip from '$lib/components/AllergenChip.svelte';
  import PhaseBadge from '$lib/components/PhaseBadge.svelte';
  import ProgressBar from '$lib/components/ProgressBar.svelte';
  import { categoryStrings } from '$lib/strings/categories';
  import { actionStrings } from '$lib/strings/actions';
  import { commonStrings, dayProgress, dnyCs } from '$lib/strings/common';
  import { phaseConfig } from '$lib/config/phases';
  import { getCategoryConfig } from '$lib/config/categories';

  const today = todayIso();
  // The `[date]` route param is always present; fall back to today only to
  // satisfy the `() => string` contract when the type says `string | undefined`.
  const view = createDayView(() => page.params.date ?? today, today);
  const catalog = new BundledCatalogAdapter();

  $effect(() => {
    if (view.redirectTo) goto(`/day/${view.redirectTo}`, { replaceState: true });
  });

  const meals = $derived(view.meals);
  const skinObservations = $derived(view.observations);
  const photos = $derived(view.photos);
  const observationTimes = $derived(
    new Map(skinObservations.map((o) => [o.id, formatObservationTime(o.createdAt)])),
  );
  const ctx = $derived(view.ctx);
  const selectedDate = $derived(view.selectedDate);
  const phase = $derived(view.phase);
  const isPreview = $derived(view.viewMode === 'preview');

  const toleranceReminders = $derived(
    ctx.status === 'ready'
      ? getToleranceBuildingRemindersForDate(ctx.schedule, selectedDate, meals, catalog)
      : [],
  );

  const protocolSlugs = $derived(
    ctx.status === 'ready'
      ? (ctx.schedule.phases.find((p) => p.type === 'elimination')?.allergenIds ?? [])
      : [],
  );

  // Display-only merge of everything eliminated today across both actors. The
  // ReadyContext keeps the three sets separate (spec #568); the day view's
  // "Vyhýbej se" list and single-actor MealCard show them combined. This is an
  // all-actors view, not the per-actor conflict rule — so it merges all three
  // sets directly rather than going through `eliminatedFor(ctx, actor)`.
  const eliminatedToday = $derived(
    ctx.status === 'ready'
      ? [...ctx.protocolEliminated, ...ctx.permanentMother, ...ctx.permanentBaby]
      : [],
  );

  const allowedProtocol = $derived(
    ctx.status === 'ready' ? protocolSlugs.filter((s) => !eliminatedToday.includes(s)) : [],
  );

  const isToday = $derived(selectedDate === today);

  const evaluations = $derived($evaluationsStore);
  const phaseEvaluation = $derived(
    phase ? (evaluations.find((e) => e.phaseId === phase.id) ?? null) : null,
  );
  const phaseHeroHref = $derived(
    evaluationHrefForPhase(phase ?? null, selectedDate, phaseEvaluation !== null) ?? '/program',
  );

  const completeness = $derived(
    dailyCompleteness({ observations: skinObservations, photos, meals }),
  );

  const dayStrip = $derived(
    ctx.status === 'ready'
      ? computeDayStrip({
          selectedDate,
          protocolStart: ctx.schedule.startDate,
          estimatedEnd: ctx.schedule.estimatedEndDate,
          today,
        })
      : computeDayStrip({ selectedDate, protocolStart: today, estimatedEnd: today, today }),
  );

  const todayRecorded = $derived(isToday && completeness > 0);

  // Imperative handle into the DayStrip — the bottom-nav "Dnes" tab pulses a
  // signal store when clicked, and we forward it to the strip so it recentres
  // on today even when the route param did not change.
  let dayStripRef: { recentre: () => void } | undefined = $state();
  $effect(() => {
    void $dayStripRecentreSignal;
    dayStripRef?.recentre();
  });

  function handleSelectDate(date: string): void {
    goto(`/day/${date}`);
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
    <a
      href="/settings"
      class="text-text-muted -mr-1.5 p-1.5"
      aria-label={commonStrings.today.settingsAria}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19.4 15a1.7 1.7 0 0 0 .3 1.8 2 2 0 1 1-2.8 2.8 1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5 2 2 0 1 1-4 0 1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3 2 2 0 1 1-2.8-2.8 1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1 2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8 2 2 0 1 1 2.8-2.8 1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5 2 2 0 1 1 4 0 1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3 2 2 0 1 1 2.8 2.8 1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1 2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.5 1z"
        />
      </svg>
    </a>
  </div>

  <!-- DayStrip -->
  <DayStrip
    bind:this={dayStripRef}
    cells={dayStrip.cells}
    {today}
    {todayRecorded}
    onselectdate={handleSelectDate}
  />

  <div class="space-y-3 px-4 pb-24">
    {#if ctx.status === 'error'}
      <ErrorAlert message={ctx.message} />
    {:else if ctx.status !== 'ready'}
      <div class="border-surface-dark rounded-2xl border bg-white p-6 text-center">
        <p class="body-muted">{commonStrings.today.noProgram}</p>
        <a href="/" class="text-primary mt-2 inline-block text-sm font-medium"
          >{actionStrings.startQuestionnaire}</a
        >
      </div>
    {:else}
      <!-- Phase hero -->
      <a
        href={phaseHeroHref}
        class="border-surface-dark block rounded-2xl border bg-white p-4 text-left"
      >
        <div class="mb-2 flex items-center gap-2.5">
          {#if phase}
            {@const display = phaseConfig[phase.type]}
            <div
              class="h-9 w-9 rounded-lg {display.iconBg} flex shrink-0 items-center justify-center text-lg"
            >
              {display.icon}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="body-bold"
                  >{display.label}{phase.allergenIds[0]
                    ? `: ${categoryStrings[phase.allergenIds[0]]?.name ?? phase.allergenIds[0]}`
                    : ''}</span
                >
                <PhaseBadge type={phase.type} />
              </div>
              {#if ctx.progress}
                <div class="text-text-muted mt-0.5 text-[11px]">
                  {dayProgress(ctx.progress.currentDay, ctx.progress.totalDays)}
                  {#if phase.endDate}
                    · {commonStrings.today.phaseUntilPrefix} {formatDateLongCs(phase.endDate)}
                  {/if}
                </div>
              {/if}
            </div>
          {:else}
            <div
              class="bg-surface-dark flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
            >
              📅
            </div>
            <div class="min-w-0 flex-1">
              <span class="body-bold">{commonStrings.today.programEnded}</span>
              {#if ctx.progress}
                <div class="text-text-muted mt-0.5 text-[11px]">
                  {dayProgress(ctx.progress.currentDay, ctx.progress.totalDays)}
                </div>
              {/if}
            </div>
          {/if}
          <span class="body-muted">›</span>
        </div>
        {#if ctx.progress}
          <ProgressBar value={ctx.progress.percentComplete} />
        {/if}
      </a>

      <!-- Today-only chrome: task counter + tolerance reminders -->
      {#if isPreview}
        <!-- Future-day read-only "Naplánováno" preview -->
        <div class="border-surface-dark rounded-2xl border bg-white p-4" data-testid="day-preview">
          <div class="text-text-muted mb-1.5 text-[10px] font-extrabold tracking-wider uppercase">
            {commonStrings.dayPreview.badge}
          </div>
          <p class="text-text-muted text-[12px]">
            {commonStrings.dayPreview.description}
          </p>
        </div>
      {:else}
        {#if isToday}
          <div
            class="border-surface-dark flex items-center justify-between rounded-2xl border bg-white px-3.5 py-2.5"
            data-testid="task-counter"
          >
            <div class="text-text text-[12px]">{commonStrings.today.counterHint}</div>
            <div class="text-text-muted text-[10px] font-bold tracking-wide">
              {completeness} / 3
            </div>
          </div>

          {#each toleranceReminders as reminder (reminder.allergenId)}
            {@const cat = getCategoryConfig(reminder.allergenId)}
            <div
              class="border-warning/40 flex items-center gap-3 rounded-2xl border bg-white px-3.5 py-3"
              data-testid="tolerance-reminder"
            >
              <span class="shrink-0 text-xl">{cat?.icon ?? '🍽'}</span>
              <div class="min-w-0 flex-1">
                <div
                  class="text-warning mb-0.5 text-[10px] font-extrabold tracking-wider uppercase"
                >
                  {commonStrings.today.reminderLabel}
                </div>
                <div class="text-text text-[12px]">
                  {cat?.name ?? reminder.allergenId}
                  {#if reminder.daysSinceLastDose >= 999}
                    — {commonStrings.today.reminderNeverDosed}
                  {:else}
                    — {commonStrings.today.reminderOverdue} {dnyCs(reminder.daysSinceLastDose)}
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        {/if}

        <!-- Skin observation card -->
        <SkinObservationCard observations={skinObservations} date={selectedDate} />

        <!-- Skin photo card -->
        <SkinPhotoCard {photos} {observationTimes} />

        <!-- Smím / Vyhýbej se -->
        <div class="border-surface-dark overflow-hidden rounded-2xl border bg-white">
          <div class="divide-surface-dark grid grid-cols-2 divide-x">
            <div class="p-3">
              <div class="text-success mb-1.5 text-[9px] font-extrabold tracking-wider uppercase">
                {commonStrings.today.allowed}
              </div>
              {#if allowedProtocol.length > 0}
                <div class="flex flex-wrap gap-1.5">
                  {#each allowedProtocol as slug}
                    <AllergenChip {slug} />
                  {/each}
                </div>
              {:else}
                <div class="text-text-muted text-[11px]">—</div>
              {/if}
            </div>
            <div class="p-3">
              <div class="text-danger mb-1.5 text-[9px] font-extrabold tracking-wider uppercase">
                {commonStrings.today.avoid}
              </div>
              {#if eliminatedToday.length > 0}
                <div class="flex flex-wrap gap-1.5">
                  {#each eliminatedToday as slug}
                    <AllergenChip {slug} color="warning" />
                  {/each}
                </div>
              {:else}
                <div class="text-success text-[11px]">{commonStrings.today.noRestrictions}</div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Meal card -->
        <MealCard date={selectedDate} {meals} eliminatedSlugs={eliminatedToday} />

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
      {/if}
    {/if}
  </div>
</div>
