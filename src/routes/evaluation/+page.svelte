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
  import { actionStrings } from '$lib/strings/actions';
  import { categoryStrings } from '$lib/strings/categories';
  import { getCategoryConfig } from '$lib/config/categories';
  import { phaseConfig } from '$lib/config/phases';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Button from '$lib/components/Button.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import ErrorAlert from '$lib/components/error-alert.svelte';
  import type { AllergenOutcome, ProtocolAllergenId, ReintroductionEvaluation, SchedulePhase, SkinObservation } from '$lib/domain/models';

  const phaseId = $derived(page.url.searchParams.get('phase') ?? '');
  const queryDate = $derived(page.url.searchParams.get('date') ?? todayIso());
  const returnTo = $derived(page.url.searchParams.get('returnTo') ?? `/day/${queryDate}`);

  const raw = $derived($scheduleRaw);
  const phase = $derived<SchedulePhase | null>(
    raw.status === 'ready'
      ? raw.schedule.phases.find((p) => p.id === phaseId) ?? null
      : null
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
            db.skin_observations.where('date').between(start, end, true, true).toArray()
          ).subscribe({
            next: (rows) => set(rows ?? []),
            error: () => set([]),
          });
          return () => sub.unsubscribe();
        })
      : readable<SkinObservation[]>([])
  );
  const observations = $derived(fromStore(observationsStore).current);

  const recap = $derived(phase ? buildPhaseRecap(phase, observations) : []);

  let selectedOutcome = $state<AllergenOutcome | null>(null);
  let notes = $state('');
  let saving = $state(false);
  let showToast = $state(false);

  const allergenSlug = $derived<ProtocolAllergenId | null>(
    phase && phase.type === 'reintroduction' ? (phase.allergenIds[0] ?? null) : null
  );
  const allergenName = $derived(
    allergenSlug ? (getCategoryConfig(allergenSlug)?.name ?? categoryStrings[allergenSlug]?.name ?? allergenSlug) : ''
  );
  const allergenIcon = $derived(allergenSlug ? (getCategoryConfig(allergenSlug)?.icon ?? '🍽') : '🍽');

  type OutcomeOption = { value: AllergenOutcome; label: string; subtitle: string };
  const outcomeOptions: OutcomeOption[] = [
    { value: 'tolerated',       label: commonStrings.program.reintroOutcomes['tolerated'],       subtitle: commonStrings.evaluation.outcomeSubtitles['tolerated'] },
    { value: 'mild-reaction',   label: commonStrings.program.reintroOutcomes['mild-reaction'],   subtitle: commonStrings.evaluation.outcomeSubtitles['mild-reaction'] },
    { value: 'clear-reaction',  label: commonStrings.program.reintroOutcomes['clear-reaction'],  subtitle: commonStrings.evaluation.outcomeSubtitles['clear-reaction'] },
    { value: 'severe-reaction', label: commonStrings.program.reintroOutcomes['severe-reaction'], subtitle: commonStrings.evaluation.outcomeSubtitles['severe-reaction'] },
  ];

  const isReadOnly = $derived(existing !== null);

  function recapBadgeClass(status?: SkinObservation['status']): string {
    switch (status) {
      case 'improved':   return 'bg-success text-white';
      case 'unchanged':  return 'bg-surface-dark text-text-muted';
      case 'worsened':   return 'bg-warning text-text';
      case 'new-lesions':return 'bg-danger text-white';
      default:           return 'bg-surface-dark text-text-muted';
    }
  }

  function recapStatusLabel(status?: SkinObservation['status']): string {
    if (!status) return commonStrings.evaluation.recapEmpty;
    return commonStrings.program.skinOutcomes[status] ?? status;
  }

  async function handleSave(): Promise<void> {
    if (saving || !selectedOutcome || !phase || !allergenSlug) return;
    saving = true;
    const evaluation: ReintroductionEvaluation = {
      phaseId,
      phaseType: 'allergen-test',
      outcome: selectedOutcome,
      allergenId: allergenSlug,
      date: queryDate,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    const result = await protocolSession.recordVerdict(evaluation);
    saving = false;
    if (!result.ok) {
      showToast = true;
      return;
    }
    goto(returnTo);
  }
</script>

<div class="page-container pb-24">
  <PageHeader title={commonStrings.evaluation.heading} onBack={() => goto(returnTo)} />

  <div class="px-4 pt-3 space-y-3">
    {#if !phase}
      <ErrorAlert message="Phase not found." />
    {:else if phase.type !== 'reintroduction'}
      <ErrorAlert message="This evaluation type is not supported yet." />
    {:else}
      <!-- Test header -->
      <div class="bg-white border border-surface-dark rounded-2xl p-3 flex items-center gap-3">
        <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 {phaseConfig.reintroduction.iconBg} text-xl">
          {allergenIcon}
        </div>
        <div class="flex-1 min-w-0">
          <div class="body-bold">{allergenName}</div>
          <div class="text-[11px] text-text-muted">
            {formatDateLongCs(phase.startDate)} – {formatDateLongCs(phase.endDate)}
          </div>
        </div>
        {#if isReadOnly}
          <span class="text-[10px] font-bold text-success uppercase tracking-wider px-2 py-1 rounded-full bg-success/10">
            {commonStrings.evaluation.readonlyBadge}
          </span>
        {/if}
      </div>

      <!-- Recap -->
      <div class="bg-white border border-surface-dark rounded-2xl p-3">
        <div class="eyebrow mb-2">{commonStrings.evaluation.recapHeading}</div>
        <div class="space-y-1.5">
          {#each recap as row (row.date)}
            <div class="flex items-center gap-2 text-[11px]">
              <span class="w-5 h-5 rounded-full {recapBadgeClass(row.skinStatus)} text-[10px] font-bold flex items-center justify-center shrink-0">{row.dayNumber}</span>
              <span class="font-medium text-text">{formatDateLongCs(row.date)}</span>
              <span class="text-text-muted ml-auto">{recapStatusLabel(row.skinStatus)}</span>
            </div>
          {/each}
        </div>
      </div>

      {#if isReadOnly && existing}
        <!-- Read-only verdict view -->
        <div class="bg-white border border-surface-dark rounded-2xl p-4 space-y-2">
          <div class="eyebrow">{commonStrings.evaluation.outcomePrompt}</div>
          <div class="body-bold">{commonStrings.program.reintroOutcomes[existing.outcome] ?? existing.outcome}</div>
          {#if existing.notes}
            <p class="body-muted">{existing.notes}</p>
          {/if}
        </div>
      {:else}
        <!-- Outcome cards -->
        <div>
          <div class="eyebrow mb-2">{commonStrings.evaluation.outcomePrompt}</div>
          <div class="space-y-1.5">
            {#each outcomeOptions as opt (opt.value)}
              {@const selected = selectedOutcome === opt.value}
              <button
                type="button"
                class="w-full bg-white rounded-xl px-3 py-2.5 flex items-center gap-3 text-left transition-colors
                  {selected ? 'border-2 border-primary ring-2 ring-primary/20' : 'border border-surface-dark'}"
                onclick={() => (selectedOutcome = opt.value)}
              >
                <div class="flex-1 min-w-0">
                  <div class="text-[12px] font-bold text-text">{opt.label}</div>
                  <div class="text-[10px] text-text-muted">{opt.subtitle}</div>
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
          <div class="rounded-xl bg-warning/15 border border-warning/40 px-3 py-2.5 text-[11px] text-text">
            {commonStrings.evaluation.severeWarning}
          </div>
        {/if}

        <!-- Notes -->
        <div>
          <textarea
            class="w-full bg-white border border-surface-dark rounded-2xl p-3 text-[13px] resize-none"
            rows="3"
            placeholder={commonStrings.evaluation.notesPlaceholder}
            bind:value={notes}
          ></textarea>
        </div>

        <!-- Save -->
        <Button
          disabled={!selectedOutcome || saving}
          onclick={handleSave}
        >
          {selectedOutcome ? commonStrings.evaluation.saveButton : commonStrings.evaluation.saveButtonDisabled}
        </Button>
      {/if}
    {/if}
  </div>
</div>

{#if showToast}
  <Toast
    message={actionStrings.cancel}
    type="error"
    onClose={() => (showToast = false)}
  />
{/if}
