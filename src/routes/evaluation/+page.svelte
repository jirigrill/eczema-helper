<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { liveQuery } from 'dexie';
  import { fromStore, readable } from 'svelte/store';
  import { db } from '$lib/db/atopic-db';
  import { scheduleRaw } from '$lib/stores/schedule-context';
  import { evaluationsStore } from '$lib/stores/evaluations-store';
  import { protocolSession } from '$lib/stores/protocol-session';
  import { buildPhaseRecap } from '$lib/domain/phase-recap';
  import { todayIso, formatDateLongCs } from '$lib/utils/date';
  import { commonStrings } from '$lib/strings/common';
  import { categoryStrings } from '$lib/strings/categories';
  import { getCategoryConfig } from '$lib/config/categories';
  import { phaseConfig } from '$lib/config/phases';
  import { evaluationView } from '$lib/config/evaluation';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Button from '$lib/components/Button.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import ErrorAlert from '$lib/components/error-alert.svelte';
  import type {
    AllergenOutcome,
    LadderAllergenId,
    RegionLevel,
    ReintroductionEvaluation,
    SchedulePhase,
    SkinObservation,
    SkinEvaluationOutcome,
  } from '$lib/domain/models';
  import { severityStrings } from '$lib/strings/skin-regions';

  const phaseId = $derived(page.url.searchParams.get('phase') ?? '');
  const queryDate = $derived(page.url.searchParams.get('date') ?? todayIso());
  const returnTo = $derived(page.url.searchParams.get('returnTo') ?? `/day/${queryDate}`);

  const raw = $derived($scheduleRaw);
  const phase = $derived<SchedulePhase | null>(
    raw.status === 'ready' ? (raw.schedule.phases.find((p) => p.id === phaseId) ?? null) : null,
  );

  const evaluations = $derived($evaluationsStore);
  const existing = $derived(evaluations.find((e) => e.phaseId === phaseId) ?? null);

  // Live observations for this phase window. Recompute when phase changes.
  const observationsStore = $derived.by(() =>
    phase
      ? readable<SkinObservation[]>([], (set) => {
          const start = phase.startDate;
          const end = phase.endDate;
          const sub = liveQuery(() =>
            db.skin_observations.where('date').between(start, end, true, true).toArray(),
          ).subscribe({
            next: (rows) => set(rows ?? []),
            error: () => set([]),
          });
          return () => sub.unsubscribe();
        })
      : readable<SkinObservation[]>([]),
  );
  const observations = $derived(fromStore(observationsStore).current);

  const recap = $derived(phase ? buildPhaseRecap(phase, observations) : []);

  let selectedOutcome = $state<AllergenOutcome | SkinEvaluationOutcome | null>(null);
  let notes = $state('');
  let saving = $state(false);
  let savedToast = $state(false);
  let saveError = $state<string | null>(null);

  // Vocabulary for this phase — allergen-test (reintroduction) vs skin-status
  // (reset / elimination). Null only for never-evaluated phases (rest etc.).
  const view = $derived(phase ? evaluationView(phase.type) : null);

  const allergenSlug = $derived<LadderAllergenId | null>(
    phase && phase.type === 'reintroduction' ? (phase.allergenIds[0] ?? null) : null,
  );

  // Header: allergen identity for a reintroduction test, phase identity otherwise.
  const headerTitle = $derived(
    allergenSlug
      ? (getCategoryConfig(allergenSlug)?.name ??
          categoryStrings[allergenSlug]?.name ??
          allergenSlug)
      : phase
        ? phaseConfig[phase.type].label
        : '',
  );
  const headerIcon = $derived(
    allergenSlug
      ? (getCategoryConfig(allergenSlug)?.icon ?? '🍽')
      : phase
        ? phaseConfig[phase.type].icon
        : '🍽',
  );
  const headerIconBg = $derived(phase ? phaseConfig[phase.type].iconBg : '');

  const isReadOnly = $derived(existing !== null);
  // Czech label for an already-recorded verdict, resolved from this phase's vocabulary.
  const existingLabel = $derived(
    existing
      ? (view?.options.find((o) => o.value === existing.outcome)?.label ?? existing.outcome)
      : '',
  );

  function recapBadgeClass(severity?: RegionLevel): string {
    switch (severity) {
      case 0:
        return 'bg-success text-white';
      case 1:
        return 'bg-warning text-text';
      case 2:
        return 'bg-warning text-text';
      case 3:
        return 'bg-danger text-white';
      default:
        return 'bg-surface-dark text-text-muted';
    }
  }

  function recapStatusLabel(severity?: RegionLevel): string {
    if (severity === undefined) return commonStrings.evaluation.recapEmpty;
    return severityStrings[severity].label;
  }

  async function handleSave(): Promise<void> {
    if (saving || !selectedOutcome || !phase || !view) return;
    saving = true;
    const evaluation: ReintroductionEvaluation = {
      phaseId,
      phaseType: view.kind,
      outcome: selectedOutcome,
      date: queryDate,
      // allergenId only applies to an allergen-test (reintroduction) verdict.
      ...(view.kind === 'allergen-test' && allergenSlug ? { allergenId: allergenSlug } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    const result = await protocolSession.recordVerdict(evaluation);
    saving = false;
    if (!result.ok) {
      saveError = result.error;
      return;
    }
    // Confirm the save, then return to the day view when the toast clears.
    savedToast = true;
  }
</script>

<div class="page-container pb-24">
  <PageHeader title={commonStrings.evaluation.heading} onBack={() => goto(returnTo)} />

  <div class="space-y-3 px-4 pt-3">
    {#if !phase}
      <ErrorAlert message="Phase not found." />
    {:else if !view}
      <ErrorAlert message="This evaluation type is not supported yet." />
    {:else}
      <!-- Phase / test header -->
      <div class="border-surface-dark flex items-center gap-3 rounded-2xl border bg-white p-3">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl {headerIconBg} text-xl"
        >
          {headerIcon}
        </div>
        <div class="min-w-0 flex-1">
          <div class="body-bold">{headerTitle}</div>
          <div class="text-text-muted text-[11px]">
            {formatDateLongCs(phase.startDate)} – {formatDateLongCs(phase.endDate)}
          </div>
        </div>
        {#if isReadOnly}
          <span
            class="text-success bg-success/10 rounded-full px-2 py-1 text-[10px] font-bold tracking-wider uppercase"
          >
            {commonStrings.evaluation.readonlyBadge}
          </span>
        {/if}
      </div>

      <!-- Recap -->
      <div class="border-surface-dark rounded-2xl border bg-white p-3">
        <div class="eyebrow mb-2">{commonStrings.evaluation.recapHeading}</div>
        <div class="space-y-1.5">
          {#each recap as row (row.date)}
            <div class="flex items-center gap-2 text-[11px]">
              <span
                class="h-5 w-5 rounded-full {recapBadgeClass(
                  row.severity,
                )} flex shrink-0 items-center justify-center text-[10px] font-bold"
                >{row.dayNumber}</span
              >
              <span class="text-text font-medium">{formatDateLongCs(row.date)}</span>
              <span class="text-text-muted ml-auto">{recapStatusLabel(row.severity)}</span>
            </div>
          {/each}
        </div>
      </div>

      {#if isReadOnly && existing}
        <!-- Read-only verdict view -->
        <div class="border-surface-dark space-y-2 rounded-2xl border bg-white p-4">
          <div class="eyebrow">{view.prompt}</div>
          <div class="body-bold">{existingLabel}</div>
          {#if existing.notes}
            <p class="body-muted">{existing.notes}</p>
          {/if}
        </div>
      {:else}
        <!-- Outcome cards -->
        <div>
          <div class="eyebrow mb-2">{view.prompt}</div>
          <div class="space-y-1.5">
            {#each view.options as opt (opt.value)}
              {@const selected = selectedOutcome === opt.value}
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-left transition-colors
                  {selected
                  ? 'border-primary ring-primary/20 border-2 ring-2'
                  : 'border-surface-dark border'}"
                onclick={() => (selectedOutcome = opt.value)}
              >
                <div class="min-w-0 flex-1">
                  <div class="text-text text-[12px] font-bold">{opt.label}</div>
                  <div class="text-text-muted text-[10px]">{opt.subtitle}</div>
                </div>
                {#if selected}
                  <span class="text-primary text-lg leading-none">✓</span>
                {/if}
              </button>
            {/each}
          </div>
        </div>

        <!-- Severe-reaction confirmation -->
        {#if selectedOutcome === 'severe-reaction'}
          <div
            class="bg-warning/15 border-warning/40 text-text rounded-xl border px-3 py-2.5 text-[11px]"
          >
            {commonStrings.evaluation.severeWarning}
          </div>
        {/if}

        <!-- Notes -->
        <div>
          <textarea
            class="border-surface-dark w-full resize-none rounded-2xl border bg-white p-3 text-[13px]"
            rows="3"
            placeholder={commonStrings.evaluation.notesPlaceholder}
            bind:value={notes}
          ></textarea>
        </div>

        <!-- Save -->
        <Button disabled={!selectedOutcome || saving} onclick={handleSave}>
          {selectedOutcome
            ? commonStrings.evaluation.saveButton
            : commonStrings.evaluation.saveButtonDisabled}
        </Button>
      {/if}
    {/if}
  </div>
</div>

{#if savedToast}
  <Toast
    message={commonStrings.evaluation.toastSaved}
    type="success"
    duration={1200}
    onClose={() => goto(returnTo)}
  />
{/if}

{#if saveError}
  <Toast message={saveError} type="error" onClose={() => (saveError = null)} />
{/if}
