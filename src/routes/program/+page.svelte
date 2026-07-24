<script lang="ts">
  // ═══════════════════════════════════════════════════════════
  // V2 Prototype — Unified Program Page
  // ═══════════════════════════════════════════════════════════
  import type {
    AllergenId,
    AllergenStatus,
    AllergenStatusValue,
    Meal,
    SchedulePhase,
    SkinObservation,
  } from '$lib/domain/models';
  import {
    getPhaseForDate,
    getProtocolEliminatedForDate,
    detectConflicts,
  } from '$lib/domain/schedule-queries';
  import { getPermanentEliminations, overallSeverity } from '$lib/domain/models';
  import { getPhaseVerdictStatuses, filterProtocolStatuses } from '$lib/domain/allergen-status';
  import { getCategoryConfig } from '$lib/config/categories';
  import { phaseConfig } from '$lib/config/phases';
  import { formatDateCs, formatDateLongCs, todayIso, daysBetween } from '$lib/utils/date';
  import { protocolSession } from '$lib/stores/protocol-session';
  import { evaluationsStore } from '$lib/stores/evaluations-store';
  import { BundledCatalogAdapter } from '$lib/adapters/bundled-catalog-adapter';
  import Toast from '$lib/components/Toast.svelte';
  import ErrorAlert from '$lib/components/error-alert.svelte';
  import AllergenChip from '$lib/components/AllergenChip.svelte';
  import Button from '$lib/components/Button.svelte';
  import { actionStrings } from '$lib/strings/actions';
  import {
    commonStrings,
    dnyCs,
    addRetestPhasesLabel,
    toastRetestNotBabyConfirmed,
    toastRetestAlreadyCleared,
    toastRetestAlreadyScheduled,
    phaseProgressLabel,
    phasesDoneAt,
    phasesCompletedSummary,
    deviationsCount,
    deviationsMore,
  } from '$lib/strings/common';
  import { severityCountSuffix } from '$lib/strings/skin-regions';

  let showToast = $state(false);
  let toastMessage = $state<string>(commonStrings.program.toastComingSoon);
  let toastType = $state<'info' | 'success' | 'warning' | 'error'>('info');
  let toastUndo = $state<(() => void) | undefined>(undefined);
  let selectedRetestSlugs = $state<string[]>([]);
  let expandedPhaseId = $state<string | null>(null);
  let meals = $state<Meal[]>([]);
  let skinObservations = $state<SkinObservation[]>([]);
  const evaluations = $derived($evaluationsStore);

  const catalog = new BundledCatalogAdapter();

  const today = $derived(todayIso());
  const ctx = $derived($protocolSession);
  const schedule = $derived(ctx.status === 'ready' ? ctx.schedule : null);
  const answers = $derived(ctx.status === 'ready' ? ctx.answers : null);
  const currentPhase = $derived(schedule ? getPhaseForDate(schedule, today) : null);
  const permanentSlugs = $derived(schedule ? getPermanentEliminations(schedule) : []);
  const protocolEliminated = $derived(ctx.status === 'ready' ? ctx.protocolEliminated : []);
  const progress = $derived(ctx.status === 'ready' ? ctx.progress : null);
  const isBeforeSchedule = $derived(!!schedule && today < schedule.startDate);
  // Declared before `isProgramDone`, which reads it.
  const activeTrainingPhases = $derived(
    schedule
      ? schedule.phases.filter(
          (p) =>
            p.type === 'tolerance-building' &&
            p.startDate <= today &&
            (p.endDate === '' || p.endDate >= today),
        )
      : [],
  );
  const isProgramDone = $derived(
    !!schedule &&
      !isBeforeSchedule &&
      today > schedule.estimatedEndDate &&
      activeTrainingPhases.length === 0,
  );
  const reintroInfo = $derived(ctx.status === 'ready' ? ctx.reintroInfo : null);

  type DisplayAllergen = { slug: string; icon: string; name: string; reason: string };
  const permanentEliminated = $derived.by((): DisplayAllergen[] => {
    function normSlug(s: string) {
      return s.includes(':') && !s.startsWith('other:') ? s.split(':')[0] : s;
    }
    return permanentSlugs.flatMap((s): DisplayAllergen[] => {
      const isMother = answers?.motherAllergies.some((a) => normSlug(a) === s) ?? false;
      const isBaby = answers?.babyConfirmedAllergies.some((a) => normSlug(a) === s) ?? false;
      const reason =
        isMother && isBaby
          ? commonStrings.program.reasonMotherAndBaby
          : isMother
            ? commonStrings.program.reasonMother
            : commonStrings.program.reasonBaby;
      if (s.startsWith('other:')) return [{ slug: s, icon: '🌿', name: s.slice(6), reason }];
      const cfg = getCategoryConfig(s.split(':')[0]!);
      if (!cfg) return [];
      return [{ slug: s, icon: cfg.icon, name: cfg.name, reason }];
    });
  });

  // ── Allergen status helpers ────────────────────────────────
  function allergenStatusLabel(status: AllergenStatusValue): string {
    return commonStrings.program.statusLabels[status] ?? status;
  }

  function allergenStatusColor(status: AllergenStatusValue): string {
    switch (status) {
      case 'passed':
        return 'text-success';
      case 'testing':
        return 'text-primary';
      case 'reacted':
        return 'text-danger';
      case 'tolerance-building':
        return 'text-primary/60';
      default:
        return 'text-text-muted/60';
    }
  }

  // Protocol + retest allergens (excludes permanent-mother / permanent-baby).
  const protocolAllergenStatuses = $derived(
    ctx.status === 'ready'
      ? filterProtocolStatuses(ctx.allergenStatuses).sort((a, b) =>
          a.status.localeCompare(b.status),
        )
      : [],
  );

  const motherAllergenStatuses = $derived(
    ctx.status === 'ready'
      ? ctx.allergenStatuses.filter((s) => s.status === 'permanent-mother')
      : [],
  );

  const babyPermanentStatuses = $derived(
    ctx.status === 'ready' ? ctx.allergenStatuses.filter((s) => s.status === 'permanent-baby') : [],
  );

  // Protocol allergens that reacted during reintroduction — retestable the same
  // way as baby-confirmed allergens (#354, PRD #208 story #8). `passed` (tolerated)
  // allergens are absent by construction, so they get no retest affordance.
  const reactedProtocolStatuses = $derived(
    ctx.status === 'ready' ? ctx.allergenStatuses.filter((s) => s.status === 'reacted') : [],
  );

  async function addRetestPhases() {
    if (!schedule || selectedRetestSlugs.length === 0) return;
    const retestResult = await protocolSession.appendReTests(selectedRetestSlugs, today);
    if (!retestResult.ok) {
      const { code, invalidIds } = retestResult.error;
      const names = invalidIds.map((id) => getCategoryConfig(id)?.name ?? id).join(', ');
      if (code === 'not-baby-confirmed') {
        toastMessage = toastRetestNotBabyConfirmed(names);
        toastType = 'error';
      } else if (code === 'already-cleared') {
        toastMessage = toastRetestAlreadyCleared(names);
        toastType = 'error';
      } else if (code === 'retest-already-scheduled') {
        toastMessage = toastRetestAlreadyScheduled(names);
        toastType = 'warning';
        toastUndo = () => {
          for (const id of invalidIds) cancelRetestPhase(id);
        };
      }
      showToast = true;
      return;
    }
    selectedRetestSlugs = [];
  }

  async function cancelRetestPhase(allergenId: string) {
    if (!schedule) return;
    const result = await protocolSession.removeReTest(allergenId, today);
    if (!result.ok) {
      toastMessage =
        result.error === 'protocol-phase'
          ? commonStrings.program.toastCannotCancelProtocol
          : commonStrings.program.toastRetestNotFound;
      toastType = 'error';
      toastUndo = undefined;
      showToast = true;
      return;
    }
    toastMessage = commonStrings.program.toastRetestCancelled;
    toastType = 'success';
    toastUndo = undefined;
    showToast = true;
  }

  function phaseIcon(type: SchedulePhase['type']): string {
    return (
      (
        {
          reset: '🔄',
          elimination: '🚫',
          reintroduction: '🔬',
          rest: '⏸️',
          training: '',
        } as Record<string, string>
      )[type] ?? '📋'
    );
  }

  function isCompleted(phase: SchedulePhase): boolean {
    if (!phase.endDate) return false;
    return phase.endDate < today;
  }
  function isCurrent(phase: SchedulePhase): boolean {
    if (!phase.endDate) return phase.startDate <= today;
    return phase.startDate <= today && phase.endDate >= today;
  }

  // dnyCs imported from $lib/strings/common

  function phaseDayCount(phase: SchedulePhase): number {
    return daysBetween(phase.startDate, phase.endDate);
  }

  function currentDayInPhase(phase: SchedulePhase): number {
    return daysBetween(phase.startDate, today);
  }

  import type {
    ReintroductionEvaluation,
    AllergenOutcome,
    SkinEvaluationOutcome,
  } from '$lib/domain/models';

  function evalLabel(ev: ReintroductionEvaluation): string {
    if (ev.phaseType === 'skin-status') {
      return commonStrings.program.skinOutcomes[ev.outcome] ?? ev.outcome;
    }
    return commonStrings.program.reintroOutcomes[ev.outcome] ?? ev.outcome;
  }

  // Outcome → tailwind text-color, split by vocabulary. Lookup objects keep
  // each vocabulary readable in isolation; an exhaustive `Record<...>` would
  // force every key on every change to the union (and there are two unions).
  const skinOutcomeColor: Record<SkinEvaluationOutcome, string> = {
    improved: 'text-success',
    unchanged: 'text-text-muted',
    worsened: 'text-warning',
    'new-lesions': 'text-danger',
  };
  const allergenOutcomeColor: Record<AllergenOutcome, string> = {
    tolerated: 'text-success',
    'mild-reaction': 'text-warning',
    'clear-reaction': 'text-danger',
    'severe-reaction': 'text-danger',
  };

  function evalColor(ev: ReintroductionEvaluation): string {
    return ev.phaseType === 'skin-status'
      ? skinOutcomeColor[ev.outcome as SkinEvaluationOutcome]
      : allergenOutcomeColor[ev.outcome as AllergenOutcome];
  }

  function nodeColor(phaseEval: ReintroductionEvaluation | undefined): string {
    if (!phaseEval) return 'bg-surface-dark';
    const o = phaseEval.outcome;
    if (o === 'tolerated' || o === 'improved') return 'bg-success';
    if (o === 'mild-reaction' || o === 'unchanged') return 'bg-warning';
    return 'bg-danger';
  }

  const nonTrainingPhases = $derived(
    schedule ? schedule.phases.filter((p: SchedulePhase) => p.type !== 'tolerance-building') : [],
  );

  type TrainingBand = { slug: string; label: string; startIndex: number; endIndex: number };
  const trainingBands = $derived.by((): TrainingBand[] => {
    if (!schedule) return [];
    return schedule.phases
      .filter((p: SchedulePhase) => p.type === 'tolerance-building' && p.startDate <= today)
      .map((tp: SchedulePhase) => {
        const slug = tp.allergenIds[0]!;
        const cfg = getCategoryConfig(slug);
        let startIdx = nonTrainingPhases.findIndex((p: SchedulePhase) =>
          p.endDate ? p.endDate >= tp.startDate : p.startDate <= today,
        );
        if (startIdx < 0) startIdx = Math.max(0, nonTrainingPhases.length - 1);
        let endIdx = startIdx;
        for (let i = nonTrainingPhases.length - 1; i >= startIdx; i--) {
          if (nonTrainingPhases[i]!.startDate <= today) {
            endIdx = i;
            break;
          }
        }
        return { slug, label: cfg?.name ?? slug, startIndex: startIdx, endIndex: endIdx };
      })
      .filter((b: TrainingBand) => b.startIndex <= b.endIndex);
  });

  function isInTrainingBand(phaseIndex: number): TrainingBand | null {
    return (
      trainingBands.find(
        (b: TrainingBand) => phaseIndex >= b.startIndex && phaseIndex <= b.endIndex,
      ) ?? null
    );
  }

  // Count conflict meals in a phase (handles in-progress phases by using today as fallback)
  function phaseConflictCount(phase: SchedulePhase): {
    count: number;
    items: { name: string; icon: string; date: string }[];
  } {
    if (!schedule) return { count: 0, items: [] };
    // Logged meals are the mother's, so combine the protocol-only set with her
    // permanent eliminations (actor-aware conflict detection, spec #564/#568).
    const eliminated = [
      ...getProtocolEliminatedForDate(schedule, phase.startDate),
      ...schedule.permanentMother,
    ];
    const phaseEnd = phase.endDate || today;
    const conflicts: { name: string; icon: string; date: string }[] = [];
    for (const meal of meals.filter(
      (m: { date: string }) => m.date >= phase.startDate && m.date <= phaseEnd,
    )) {
      for (const conflict of detectConflicts(meal.items, eliminated, catalog)) {
        if (!conflicts.some((c) => c.name === conflict.name && c.date === meal.date)) {
          // `detectConflicts` returns the offending MealItems; the icon comes
          // from the eliminated allergen that the food actually triggers.
          const trigger = catalog
            .allergensForFood(conflict.foodId)
            .find((a) => eliminated.includes(a as AllergenId));
          const cfg = trigger ? getCategoryConfig(trigger) : undefined;
          conflicts.push({ name: conflict.name, icon: cfg?.icon ?? '🍽️', date: meal.date });
        }
      }
    }
    return { count: conflicts.length, items: conflicts.slice(0, 3) };
  }

  function handleEditSchedule() {
    toastMessage = commonStrings.program.toastComingSoon;
    toastType = 'info';
    showToast = true;
  }
</script>

{#snippet retestChip(allergenId: string)}
  {@const cat = getCategoryConfig(allergenId)}
  {#if cat}
    {@const isChosen = selectedRetestSlugs.includes(allergenId)}
    <button
      type="button"
      class="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-all
        {isChosen
        ? 'bg-primary border-primary text-white'
        : 'text-text border-surface-dark bg-white'}"
      onclick={() => {
        selectedRetestSlugs = isChosen
          ? selectedRetestSlugs.filter((s) => s !== allergenId)
          : [...selectedRetestSlugs, allergenId];
      }}
    >
      {cat.icon}
      {cat.name}
      {#if isChosen}<span class="ml-1">✓</span>{/if}
    </button>
  {/if}
{/snippet}

{#snippet retestSectionCard(eyebrow: string, note: string, statuses: AllergenStatus[])}
  <div class="card-base space-y-3">
    <p class="eyebrow mb-1">{eyebrow}</p>
    <p class="body-muted text-xs">{note}</p>
    <div class="flex flex-wrap gap-2">
      {#each statuses as allergenStatus (allergenStatus.allergenId)}
        {@render retestChip(allergenStatus.allergenId)}
      {/each}
    </div>
  </div>
{/snippet}

{#snippet skinOutcomes(observations: SkinObservation[])}
  {@const calm = observations.filter((o) => overallSeverity(o) === 0).length}
  {@const mild = observations.filter((o) => overallSeverity(o) === 1).length}
  {@const medium = observations.filter((o) => overallSeverity(o) === 2).length}
  {@const severe = observations.filter((o) => overallSeverity(o) === 3).length}
  <div class="text-text-muted flex flex-wrap gap-2">
    {#if calm > 0}<span class="text-success font-medium">✓ {calm}{severityCountSuffix(0)}</span
      >{/if}
    {#if mild > 0}<span class="text-warning font-medium">— {mild}{severityCountSuffix(1)}</span
      >{/if}
    {#if medium > 0}<span class="text-warning font-medium">! {medium}{severityCountSuffix(2)}</span
      >{/if}
    {#if severe > 0}<span class="text-danger font-medium">!! {severe}{severityCountSuffix(3)}</span
      >{/if}
  </div>
{/snippet}

<div class="page-container space-y-4 pb-24">
  {#if ctx.status === 'error'}
    <ErrorAlert message={ctx.message} />
  {:else if !schedule}
    <p class="body-muted">{commonStrings.program.noProgram}</p>
  {:else}
    <!-- ═══ Hero card: progress + current phase + CTA ═══ -->
    <div class="card-base space-y-3">
      <div class="flex items-center gap-4">
        <!-- Progress ring -->
        <div class="relative h-16 w-16 shrink-0">
          <svg class="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r="27"
              fill="none"
              stroke="var(--color-surface-dark)"
              stroke-width="5"
            />
            <circle
              cx="32"
              cy="32"
              r="27"
              fill="none"
              stroke="var(--color-primary)"
              stroke-width="5"
              stroke-linecap="round"
              stroke-dasharray={2 * Math.PI * 27}
              stroke-dashoffset={2 *
                Math.PI *
                27 *
                (1 - (isBeforeSchedule ? 0 : (progress?.percentComplete ?? 0)) / 100)}
              class="progress-ring-animated"
            />
          </svg>
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-text text-[11px] font-bold"
              >{isBeforeSchedule ? 0 : (progress?.percentComplete ?? 0)}%</span
            >
          </div>
        </div>

        <!-- Phase info -->
        <div class="min-w-0 flex-1">
          {#if isBeforeSchedule}
            <p class="body-semibold">{commonStrings.program.notStarted}</p>
            <p class="body-muted mt-0.5">
              {commonStrings.program.startingPrefix}
              {formatDateCs(schedule.startDate)}
            </p>
          {:else if isProgramDone}
            <p class="body-semibold">{commonStrings.program.completed}</p>
            <p class="body-muted mt-0.5">
              {phasesDoneAt(schedule.phases.length, formatDateLongCs(today))}
            </p>
          {:else if currentPhase}
            <p class="body-semibold leading-snug">
              {phaseConfig[currentPhase.type].label}{currentPhase.allergenIds[0]
                ? `: ${getCategoryConfig(currentPhase.allergenIds[0])?.name ?? currentPhase.allergenIds[0]}`
                : ''}
            </p>
            <p class="body-muted mt-0.5">
              {phaseProgressLabel(
                currentDayInPhase(currentPhase),
                currentPhase.endDate ? phaseDayCount(currentPhase) : null,
                formatDateLongCs(today),
              )}
            </p>
          {/if}
        </div>
      </div>

      <!-- Phase-specific context -->
      {#if !isBeforeSchedule && !isProgramDone && currentPhase}
        <div class="border-surface-dark space-y-3 border-t pt-3">
          {#if currentPhase.type === 'reset'}
            <div>
              <p class="eyebrow mb-1">{commonStrings.program.sectionTodo}</p>
              <!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted static UI string from $lib/strings, never user input -->
              <p class="body-muted">{@html commonStrings.program.resetTodoHtml}</p>
            </div>
            {#if permanentEliminated.length > 0}
              <div>
                <p class="eyebrow mb-1">{commonStrings.program.sectionPermanent}</p>
                <p class="body-muted mb-2">{commonStrings.program.sectionPermanentNote}</p>
                <div class="flex flex-wrap gap-1.5">
                  {#each permanentEliminated as item (item.slug)}
                    <AllergenChip slug={item.slug} />
                  {/each}
                </div>
              </div>
            {/if}
          {:else if currentPhase.type === 'elimination'}
            <div>
              <p class="eyebrow mb-1">{commonStrings.program.sectionTodo}</p>
              <!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted static UI string from $lib/strings, never user input -->
              <p class="body-muted">{@html commonStrings.program.eliminationTodoHtml}</p>
            </div>
            <div>
              <p class="eyebrow text-danger mb-1">{commonStrings.program.sectionEliminated}</p>
              <div class="flex flex-wrap gap-1.5">
                {#each protocolEliminated.filter((s) => getCategoryConfig(s) !== undefined) as slug (slug)}
                  <AllergenChip {slug} color="warning" />
                {/each}
              </div>
            </div>
            {#if permanentEliminated.length > 0}
              <div>
                <p class="eyebrow mb-1">{commonStrings.program.sectionPermanent}</p>
                <p class="body-muted mb-2">{commonStrings.program.sectionPermanentReasonNote}</p>
                <div class="flex flex-wrap gap-1.5">
                  {#each permanentEliminated as item (item.slug)}
                    <AllergenChip slug={item.slug} />
                  {/each}
                </div>
              </div>
            {/if}
          {:else if currentPhase.type === 'reintroduction'}
            {@const testCat = getCategoryConfig(currentPhase.allergenIds[0]!)}

            <div>
              <p class="eyebrow mb-1">{commonStrings.program.sectionTodo}</p>
              <p class="body-muted">
                {commonStrings.program.reintroAddPrefix}
                <strong>{testCat?.name?.toLowerCase() ?? ''}</strong>
                {commonStrings.program.reintroAddSuffix}
                {#if reintroInfo?.isEvaluationDay}
                  {commonStrings.program.reintroTodayEval}
                {:else}
                  {commonStrings.program.reintroMonitor}
                {/if}
              </p>
            </div>

            {#if testCat}
              <div>
                <p class="eyebrow text-success mb-1">{commonStrings.program.sectionTesting}</p>
                <div class="flex flex-wrap items-center gap-1.5">
                  <AllergenChip slug={currentPhase.allergenIds[0]!} color="success" />
                  {#if reintroInfo}
                    <span class="body-muted">
                      den {reintroInfo.dayInPhase} z {reintroInfo.totalDays}
                    </span>
                  {/if}
                </div>
              </div>
            {/if}

            {#if protocolEliminated.length > 0}
              <div>
                <p class="eyebrow mb-1">{commonStrings.program.sectionStillEliminated}</p>
                <div class="flex flex-wrap gap-1.5">
                  {#each protocolEliminated.filter((s) => getCategoryConfig(s) !== undefined) as slug (slug)}
                    <AllergenChip {slug} />
                  {/each}
                </div>
              </div>
            {/if}

            {#if permanentEliminated.length > 0}
              <div>
                <p class="eyebrow mb-1">{commonStrings.program.sectionPermanent}</p>
                <div class="flex flex-wrap gap-1.5">
                  {#each permanentEliminated as item (item.slug)}
                    <AllergenChip slug={item.slug} />
                  {/each}
                </div>
              </div>
            {/if}
          {:else if currentPhase.type === 'rest'}
            <div>
              <p class="eyebrow mb-1">{commonStrings.program.sectionTodo}</p>
              <p class="body-muted">{phaseConfig[currentPhase.type].description}</p>
            </div>
          {:else if currentPhase.type === 'tolerance-building'}
            {@const trainingCat = getCategoryConfig(currentPhase.allergenIds[0]!)}

            <div>
              <p class="eyebrow mb-1">{commonStrings.program.sectionTodo}</p>
              <p class="body-muted">
                {commonStrings.program.toleranceBuildingPrefix}
                <strong>{trainingCat?.name?.toLowerCase() ?? ''}</strong>
                {commonStrings.program.toleranceBuildingSuffix}
              </p>
            </div>
          {/if}
        </div>

        <!-- ═══ Live phase details ═══ -->
        {@const heroConflicts = phaseConflictCount(currentPhase)}
        {@const heroAssessments = (skinObservations ?? []).filter(
          (a: { date: string }) =>
            a.date >= currentPhase.startDate && a.date <= (currentPhase.endDate || today),
        )}
        {@const heroEval = (evaluations ?? []).find(
          (e: ReintroductionEvaluation) => e.phaseId === currentPhase.id,
        )}

        <div class="border-surface-dark space-y-3 border-t pt-3 text-xs">
          <div>
            <p class="eyebrow mb-1">{commonStrings.program.sectionDeviations}</p>
            {#if heroConflicts.count === 0}
              <p class="text-text-muted">{commonStrings.program.noDeviations}</p>
            {:else}
              <p class="text-warning mb-1 font-medium">{deviationsCount(heroConflicts.count)}</p>
              <div class="muted-list">
                {#each heroConflicts.items as c}
                  <p>{c.icon} {c.name} · {formatDateCs(c.date)}</p>
                {/each}
                {#if heroConflicts.count > 3}
                  <p class="text-text-muted/60">{deviationsMore(heroConflicts.count - 3)}</p>
                {/if}
              </div>
            {/if}
          </div>

          <div>
            <p class="eyebrow mb-1">{commonStrings.program.sectionSkinReaction}</p>
            {#if heroAssessments.length === 0}
              <p class="text-text-muted">{commonStrings.program.noSkinRecords}</p>
            {:else}
              {@render skinOutcomes(heroAssessments)}
            {/if}
          </div>

          {#if currentPhase.type === 'reintroduction'}
            {#if protocolAllergenStatuses.length > 1}
              <div>
                <p class="eyebrow mb-1">{commonStrings.program.sectionAllergenStatus}</p>
                <div class="muted-list">
                  {#each protocolAllergenStatuses as row}
                    {@const rowCat = getCategoryConfig(row.allergenId)}
                    <div class="flex items-center gap-2">
                      <span>{rowCat?.icon ?? ''}</span>
                      <span class="flex-1">{rowCat?.name ?? row.allergenId}</span>
                      {#if schedule?.permanentBaby.includes(row.allergenId)}
                        <span class="text-text-muted/50 text-[10px]"
                          >{commonStrings.program.fromQuestionnaire}</span
                        >
                      {/if}
                      <span class={allergenStatusColor(row.status)}
                        >{allergenStatusLabel(row.status)}</span
                      >
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          {/if}

          <div>
            <p class="eyebrow mb-1">{commonStrings.program.sectionEvaluation}</p>
            {#if heroEval}
              <p class="font-medium {evalColor(heroEval)}">
                {evalLabel(heroEval)}{#if heroEval.notes}
                  <span class="text-text-muted font-normal">— {heroEval.notes}</span>{/if}
              </p>
            {:else}
              <p class="text-text-muted">{commonStrings.program.evaluationPending}</p>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <!-- ═══ Timeline: all phases ═══ -->
    <div class="relative">
      <!-- Vertical line -->
      <div class="bg-surface-dark absolute top-3 bottom-3 left-[15px] w-px"></div>

      <div class="space-y-1">
        {#each nonTrainingPhases as phase, phaseIndex (phase.id)}
          {@const done = isCompleted(phase)}
          {@const current = isCurrent(phase)}
          {@const phaseEval = (evaluations ?? []).find(
            (e: ReintroductionEvaluation) => e.phaseId === phase.id,
          )}
          {@const trainingBand = isInTrainingBand(phaseIndex)}

          <!-- Training band label on first row -->
          {#if trainingBand && phaseIndex === trainingBand.startIndex}
            {@const bandCat = getCategoryConfig(trainingBand.slug)}
            <div class="-mb-1 ml-11">
              <span class="text-primary/60 text-[10px] font-medium">
                {bandCat?.icon ?? ''}
                {commonStrings.program.trainingLabel}
                {trainingBand.label}
              </span>
            </div>
          {/if}

          <!-- Phase row -->
          <div
            class={trainingBand
              ? 'border-primary/30 bg-primary/10 rounded-r-lg border-l-2 pl-0.5'
              : ''}
          >
            {#if done}
              <!-- Completed: flat row, colored circle by outcome -->
              <button
                type="button"
                class="flex w-full items-center gap-3 py-2 pr-2 pl-0 text-left"
                onclick={() => (expandedPhaseId = expandedPhaseId === phase.id ? null : phase.id)}
              >
                <div
                  class="h-8 w-8 shrink-0 rounded-full {nodeColor(
                    phaseEval,
                  )} z-10 flex items-center justify-center"
                ></div>
                <span class="body-muted flex-1 truncate"
                  >{phaseConfig[phase.type].label}{phase.allergenIds[0]
                    ? `: ${getCategoryConfig(phase.allergenIds[0])?.name ?? phase.allergenIds[0]}`
                    : ''}</span
                >
                <span class="text-text-muted/50 shrink-0 text-xs"
                  >{formatDateCs(phase.startDate)}{phase.endDate
                    ? `–${formatDateCs(phase.endDate)}`
                    : '–…'}</span
                >
                <span class="body-muted shrink-0">{expandedPhaseId === phase.id ? '▾' : '▸'}</span>
              </button>

              {#if expandedPhaseId === phase.id}
                {@const conflicts = phaseConflictCount(phase)}
                {#each [(skinObservations ?? []).filter((a: { date: string }) => a.date >= phase.startDate && a.date <= phase.endDate)] as phaseAssessments}
                  <div class="ml-11 space-y-3 pb-2 text-xs">
                    <!-- Dietary deviations -->
                    <div>
                      <p class="eyebrow mb-1">{commonStrings.program.sectionDeviations}</p>
                      {#if conflicts.count === 0}
                        <p class="text-text-muted">{commonStrings.program.noDeviations}</p>
                      {:else}
                        <p class="text-warning mb-1 font-medium">
                          {deviationsCount(conflicts.count)}
                        </p>
                        <div class="muted-list">
                          {#each conflicts.items as c}
                            <p>{c.icon} {c.name} · {formatDateCs(c.date)}</p>
                          {/each}
                          {#if conflicts.count > 3}
                            <p class="text-text-muted/60">{deviationsMore(conflicts.count - 3)}</p>
                          {/if}
                        </div>
                      {/if}
                    </div>

                    <!-- Skin reactions -->
                    <div>
                      <p class="eyebrow mb-1">{commonStrings.program.sectionSkinReaction}</p>
                      {#if phaseAssessments.length === 0}
                        <p class="text-text-muted">{commonStrings.program.noSkinRecords}</p>
                      {:else}
                        {@render skinOutcomes(phaseAssessments)}
                        {#if phaseAssessments.some((o: SkinObservation) => overallSeverity(o) >= 2) && phase.type === 'reintroduction'}
                          {@const phaseCat = getCategoryConfig(phase.allergenIds[0]!)}
                          <p class="text-text-muted mt-1">
                            {commonStrings.program.possibleCausePrefix}
                            {phaseCat?.icon}
                            {phaseCat?.name ?? phase.allergenIds[0]}
                          </p>
                        {/if}
                      {/if}
                    </div>

                    <!-- Per-allergen status for reintroduction -->
                    {#if phase.type === 'reintroduction' && schedule}
                      {@const phaseRows = getPhaseVerdictStatuses(schedule, phase).sort((a, b) =>
                        a.status.localeCompare(b.status),
                      )}
                      {#if phaseRows.length > 1}
                        <div>
                          <p class="eyebrow mb-1">{commonStrings.program.sectionAllergenStatus}</p>
                          <div class="muted-list">
                            {#each phaseRows as row}
                              {@const rowCat = getCategoryConfig(row.allergenId)}
                              <div class="flex items-center gap-2">
                                <span>{rowCat?.icon ?? ''}</span>
                                <span class="flex-1">{rowCat?.name ?? row.allergenId}</span>
                                {#if schedule.permanentBaby.includes(row.allergenId)}
                                  <span class="text-text-muted/50 text-[10px]"
                                    >{commonStrings.program.fromQuestionnaire}</span
                                  >
                                {/if}
                                <span class={allergenStatusColor(row.status)}
                                  >{allergenStatusLabel(row.status)}</span
                                >
                              </div>
                            {/each}
                          </div>
                        </div>
                      {/if}
                    {/if}

                    <!-- Overall evaluation -->
                    <div>
                      <p class="eyebrow mb-1">{commonStrings.program.sectionEvaluation}</p>
                      {#if phaseEval}
                        <p class="font-medium {evalColor(phaseEval)}">
                          {evalLabel(phaseEval)}{#if phaseEval.notes}
                            <span class="text-text-muted font-normal">— {phaseEval.notes}</span
                            >{/if}
                        </p>
                      {:else}
                        <a
                          href="/evaluation?phase={encodeURIComponent(
                            phase.id,
                          )}&date={phase.endDate}&returnTo=%2Fprogram"
                          class="text-primary inline-block font-medium no-underline"
                          >{actionStrings.evaluatePhase}</a
                        >
                      {/if}
                    </div>
                  </div>
                {/each}
              {/if}
            {:else if current}
              <!-- Current: highlighted node -->
              <div class="flex items-center gap-3 py-2 pr-2 pl-0">
                <div
                  class="bg-primary ring-primary/20 z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm text-white ring-4"
                >
                  {phaseIcon(phase.type)}
                </div>
                <span class="text-text flex-1 text-sm font-semibold"
                  >{phaseConfig[phase.type].label}{phase.allergenIds[0]
                    ? `: ${getCategoryConfig(phase.allergenIds[0])?.name ?? phase.allergenIds[0]}`
                    : ''}</span
                >
                <span
                  class="bg-primary shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                  >{commonStrings.program.now}</span
                >
              </div>
            {:else}
              <!-- Upcoming: read-only row (retest phases get cancel affordance) -->
              {@const isRetestPhase = phase.id.startsWith('retest-')}
              <div
                class="flex items-center gap-3 py-1.5 pr-2 pl-0 {isRetestPhase ? '' : 'opacity-50'}"
              >
                <div
                  class="border-surface-dark z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-white text-sm"
                >
                  {phaseIcon(phase.type)}
                </div>
                <span class="body-muted flex-1"
                  >{phaseConfig[phase.type].label}{phase.allergenIds[0]
                    ? `: ${getCategoryConfig(phase.allergenIds[0])?.name ?? phase.allergenIds[0]}`
                    : ''}</span
                >
                {#if isRetestPhase}
                  <button
                    type="button"
                    class="text-danger/70 hover:text-danger hover:bg-danger/10 shrink-0 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
                    onclick={() => cancelRetestPhase(phase.allergenIds[0]!)}
                  >
                    {actionStrings.cancel}
                  </button>
                {:else}
                  <span class="text-text-muted/60 shrink-0 text-xs"
                    >{phase.endDate
                      ? dnyCs(phaseDayCount(phase))
                      : commonStrings.program.ongoing}</span
                  >
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- ═══ End-of-program card ═══ -->
    {#if isProgramDone}
      <div data-state="success" class="rounded-2xl border p-5">
        <div class="text-center">
          <p class="mb-1 text-2xl">🎉</p>
          <p class="text-text text-base font-bold">{commonStrings.program.completedBanner}</p>
          <p class="body-muted mt-1">
            {phasesCompletedSummary(
              schedule.phases.length,
              daysBetween(schedule.startDate, schedule.estimatedEndDate),
            )}
          </p>
        </div>
      </div>
    {/if}

    <!-- ═══ Permanent allergen sections ═══ -->
    {#if motherAllergenStatuses.length > 0}
      <div class="card-base space-y-3">
        <p class="eyebrow mb-1">{commonStrings.program.motherAllergensSection}</p>
        <p class="body-muted text-xs">{commonStrings.program.motherAllergensNote}</p>
        <div class="flex flex-wrap gap-1.5">
          {#each motherAllergenStatuses as s (s.allergenId)}
            <AllergenChip slug={s.allergenId} />
          {/each}
        </div>
      </div>
    {/if}

    {#if babyPermanentStatuses.length > 0}
      {@render retestSectionCard(
        commonStrings.program.babyAllergensSection,
        commonStrings.program.babyAllergensNote,
        babyPermanentStatuses,
      )}
    {/if}

    {#if reactedProtocolStatuses.length > 0}
      {@render retestSectionCard(
        commonStrings.program.reactedAllergensSection,
        commonStrings.program.reactedAllergensNote,
        reactedProtocolStatuses,
      )}
    {/if}

    <!-- Shared retest confirm — one selection model across both retest sections -->
    {#if selectedRetestSlugs.length > 0}
      <Button onclick={addRetestPhases}>
        {addRetestPhasesLabel(selectedRetestSlugs.length)}
      </Button>
    {/if}

    <!-- Edit notice -->
    <div class="pt-2 text-center">
      <Button variant="ghost-sm" onclick={handleEditSchedule}>{actionStrings.editSchedule}</Button>
    </div>
  {/if}
</div>

{#if showToast}
  <Toast
    message={toastMessage}
    type={toastType}
    onUndo={toastUndo}
    onClose={() => {
      showToast = false;
      toastType = 'info';
      toastUndo = undefined;
    }}
  />
{/if}

<style>
  .progress-ring-animated {
    transition: stroke-dashoffset 0.6s ease;
  }
</style>
