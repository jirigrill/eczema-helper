<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { scheduleRaw } from '$lib/stores/schedule-context';
  import { createMealSession } from '$lib/stores/meal-session';
  import { createSkinObservationSession } from '$lib/stores/skin-observation-session';
  import { createSkinPhotoSession } from '$lib/stores/skin-photo-session';
  import { buildScheduleContext, getPhaseForDate } from '$lib/domain/schedule-queries';
  import { getToleranceBuildingRemindersForDate } from '$lib/domain/schedule-builder';
  import { resolveRouteDate, todayIso, formatDateLongCs } from '$lib/utils/date';
  import { computeWeekStrip } from '$lib/components/WeekStrip/week-strip';
  import WeekStrip from '$lib/components/WeekStrip/WeekStrip.svelte';
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
  import { categoryConfig } from '$lib/config/categories';

  const today = todayIso();
  const raw = $derived($scheduleRaw);

  // Resolve the route param to a valid date or redirect sentinel.
  const param = $derived(page.params.date);

  // selectedDate: valid resolved date, or today as fallback while schedule loads.
  const selectedDate = $derived((): string => {
    if (raw.status !== 'ready') return today;
    const result = resolveRouteDate(param, raw.schedule.startDate, today);
    return result.type === 'date' ? result.date : today;
  });

  // Redirect on invalid/future/pre-start param once schedule is ready.
  $effect(() => {
    if (raw.status !== 'ready') return;
    const result = resolveRouteDate(param, raw.schedule.startDate, today);
    if (result.type === 'redirect') {
      goto(`/day/${result.to}`, { replaceState: true });
    }
  });

  // Date-scoped session stores — recreated when selectedDate changes.
  const mealSession = $derived(createMealSession(selectedDate()));
  const skinObservationSession = $derived(createSkinObservationSession(selectedDate()));
  const skinPhotoSession = $derived(createSkinPhotoSession(selectedDate()));

  const meals = $derived($mealSession);
  const skinObservations = $derived($skinObservationSession);
  const photos = $derived($skinPhotoSession);

  // Date-projected schedule context.
  const ctx = $derived(
    raw.status === 'ready'
      ? { status: 'ready' as const, ...buildScheduleContext({ schedule: raw.schedule, answers: raw.answers }, selectedDate()) }
      : raw
  );

  const phase = $derived(ctx.status === 'ready' ? getPhaseForDate(ctx.schedule, selectedDate()) : null);

  const toleranceReminders = $derived(
    ctx.status === 'ready'
      ? getToleranceBuildingRemindersForDate(ctx.schedule, selectedDate(), meals)
      : []
  );

  const protocolSlugs = $derived(
    ctx.status === 'ready'
      ? (ctx.schedule.phases.find((p) => p.type === 'elimination')?.allergenIds ?? [])
      : []
  );

  const allowedProtocol = $derived(
    ctx.status === 'ready'
      ? protocolSlugs.filter((s) => !ctx.eliminatedToday.includes(s))
      : []
  );

  const isToday = $derived(selectedDate() === today);

  // WeekStrip data — needs protocolStart from schedule.
  const weekStrip = $derived(
    ctx.status === 'ready'
      ? computeWeekStrip(selectedDate(), ctx.schedule.startDate, today)
      : computeWeekStrip(selectedDate(), today, today)
  );

  function czechWeekday(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('cs-CZ', { weekday: 'long' });
  }

  function handleSelectDate(date: string): void {
    goto(`/day/${date}`);
  }
</script>

<div class="max-w-lg mx-auto">
  <!-- Header -->
  <div class="px-4 pt-4 pb-2 flex items-end justify-between">
    <div>
      <div class="micro-label">
        {czechWeekday(selectedDate())} · {formatDateLongCs(selectedDate())}
      </div>
      <h2 class="page-heading">{isToday ? commonStrings.today.heading : formatDateLongCs(selectedDate())}</h2>
    </div>
    <a
      href="/settings"
      class="text-text-muted p-1.5 -mr-1.5"
      aria-label={commonStrings.today.settingsAria}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8 2 2 0 1 1-2.8 2.8 1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5 2 2 0 1 1-4 0 1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3 2 2 0 1 1-2.8-2.8 1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1 2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8 2 2 0 1 1 2.8-2.8 1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5 2 2 0 1 1 4 0 1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3 2 2 0 1 1 2.8 2.8 1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1 2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.5 1z" />
      </svg>
    </a>
  </div>

  <!-- WeekStrip -->
  <WeekStrip
    cells={weekStrip.cells}
    showDnesPill={weekStrip.showDnesPill}
    {today}
    onselectdate={handleSelectDate}
  />

  <div class="px-4 pb-24 space-y-3">
    {#if ctx.status === 'error'}
      <ErrorAlert message={ctx.message} />
    {:else if ctx.status !== 'ready'}
      <div class="bg-white rounded-2xl border border-surface-dark p-6 text-center">
        <p class="body-muted">{commonStrings.today.noProgram}</p>
        <a href="/" class="text-primary text-sm font-medium mt-2 inline-block">{actionStrings.startQuestionnaire}</a>
      </div>
    {:else}
      <!-- Phase hero -->
      <a
        href="/program"
        class="block bg-white rounded-2xl border border-surface-dark p-4 text-left"
      >
        <div class="flex items-center gap-2.5 mb-2">
          {#if phase}
            {@const display = phaseConfig[phase.type]}
            <div class="w-9 h-9 rounded-lg {display.iconBg} flex items-center justify-center text-lg shrink-0">
              {display.icon}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="body-bold">{display.label}{phase.allergenIds[0] ? `: ${categoryStrings[phase.allergenIds[0]]?.name ?? phase.allergenIds[0]}` : ''}</span>
                <PhaseBadge type={phase.type} />
              </div>
              {#if ctx.progress}
                <div class="text-[11px] text-text-muted mt-0.5">
                  {dayProgress(ctx.progress.currentDay, ctx.progress.totalDays)}
                  {#if phase.endDate}
                    · do {formatDateLongCs(phase.endDate)}
                  {/if}
                </div>
              {/if}
            </div>
          {:else}
            <div class="w-9 h-9 rounded-lg bg-surface-dark flex items-center justify-center text-lg shrink-0">📅</div>
            <div class="flex-1 min-w-0">
              <span class="body-bold">{commonStrings.today.programEnded}</span>
              {#if ctx.progress}
                <div class="text-[11px] text-text-muted mt-0.5">
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
      {#if isToday}
        <div class="bg-white border border-surface-dark rounded-2xl px-3.5 py-2.5 flex items-center justify-between" data-testid="task-counter">
          <div class="text-[12px] text-text">{commonStrings.today.counterHint}</div>
          <div class="text-[10px] text-text-muted font-bold tracking-wide">0 / 3</div>
        </div>

        {#each toleranceReminders as reminder (reminder.allergenId)}
          {@const cat = categoryConfig[reminder.allergenId]}
          <div class="bg-white border border-warning/40 rounded-2xl px-3.5 py-3 flex items-center gap-3" data-testid="tolerance-reminder">
            <span class="text-xl shrink-0">{cat?.icon ?? '🍽'}</span>
            <div class="flex-1 min-w-0">
              <div class="text-[10px] font-extrabold tracking-wider text-warning uppercase mb-0.5">
                {commonStrings.today.reminderLabel}
              </div>
              <div class="text-[12px] text-text">
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
      <SkinObservationCard observations={skinObservations} />

      <!-- Skin photo card -->
      <SkinPhotoCard photos={photos} />

      <!-- Smím / Vyhýbej se -->
      <div class="bg-white border border-surface-dark rounded-2xl overflow-hidden">
        <div class="grid grid-cols-2 divide-x divide-surface-dark">
          <div class="p-3">
            <div class="text-[9px] font-extrabold tracking-wider text-success uppercase mb-1.5">
              {commonStrings.today.allowed}
            </div>
            {#if allowedProtocol.length > 0}
              <div class="flex flex-wrap gap-1.5">
                {#each allowedProtocol as slug}
                  <AllergenChip {slug} />
                {/each}
              </div>
            {:else}
              <div class="text-[11px] text-text-muted">—</div>
            {/if}
          </div>
          <div class="p-3">
            <div class="text-[9px] font-extrabold tracking-wider text-danger uppercase mb-1.5">
              {commonStrings.today.avoid}
            </div>
            {#if ctx.eliminatedToday.length > 0}
              <div class="flex flex-wrap gap-1.5">
                {#each ctx.eliminatedToday as slug}
                  <AllergenChip {slug} color="warning" />
                {/each}
              </div>
            {:else}
              <div class="text-[11px] text-success">{commonStrings.today.noRestrictions}</div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Meal card -->
      <MealCard date={selectedDate()} meals={meals} eliminatedToday={ctx.eliminatedToday} />

      <!-- Bottom hint -->
      <div class="mt-2 flex items-center justify-center gap-2 text-[11px] text-text-muted/70">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="rotate-180">
          <path d="M12 19V5M5 12l7-7 7 7"/>
        </svg>
        <span>{commonStrings.today.recordHint}</span>
      </div>
    {/if}
  </div>
</div>
