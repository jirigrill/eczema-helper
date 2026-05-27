<script lang="ts">
  // ═══════════════════════════════════════════════════════════
  // V2 Prototype — Onboarding Questionnaire (5 steps)
  // ═══════════════════════════════════════════════════════════
  import { goto } from '$app/navigation';
  import CategoryGrid from '$lib/components/CategoryGrid.svelte';
  import FormInput from '$lib/components/form-input.svelte';
  import ErrorAlert from '$lib/components/error-alert.svelte';
  import InfoBanner from '$lib/components/InfoBanner.svelte';
  import SummaryCard from '$lib/components/SummaryCard.svelte';
  import ProgressBar from '$lib/components/ProgressBar.svelte';
  import Button from '$lib/components/Button.svelte';
  import { generateSchedule } from '$lib/domain/schedule-builder';
  import type { EczemaSeverity, QuestionnaireAnswers } from '$lib/domain/models';
  import { DEFAULT_TESTED_ALLERGENS } from '$lib/data/categories';
  import { categoryStrings, subitemStrings } from '$lib/strings/categories';
  import { actionStrings } from '$lib/strings/actions';
  import { commonStrings, tyzdnyCs, mesiceCs, allergenWordCs } from '$lib/strings/common';
  import type { ProtocolAllergenId, SubitemId } from '$lib/domain/models';
  import { formatDateLongCs } from '$lib/utils/date';
  import { phaseStrings } from '$lib/strings/phases';
  import { db } from '$lib/db/atopic-db';
  import { DexieQuestionnaireRepository } from '$lib/adapters/dexie-questionnaire-repository';
  import { DexieScheduleRepository } from '$lib/adapters/dexie-schedule-repository';

  const questionnaireRepo = new DexieQuestionnaireRepository(db);
  const scheduleRepo = new DexieScheduleRepository(db);

  // ── Form state ────────────────────────────────────────────
  let step = $state(1);
  const TOTAL_STEPS = 6;

  let babyBirthDate = $state('');
  let severity = $state<EczemaSeverity>('moderate');
  let motherAllergies = $state<string[]>([]);
  let babyAllergies = $state<string[]>([]);
  let programStartDate = $state(new Date().toISOString().split('T')[0]);

  const progress = $derived(((step - 1) / (TOTAL_STEPS - 1)) * 100);

  const permanentSlugs = $derived(
    [...new Set([...motherAllergies.map(s => s.split(':')[0]), ...babyAllergies.map(s => s.split(':')[0])])]
  );
  const reintroQueue = $derived(DEFAULT_TESTED_ALLERGENS.filter(s => !permanentSlugs.includes(s)));
  const elimDays = $derived(severity === 'severe' ? 21 : 14);
  const reintroDays = 4;

  // ── Severity options ──────────────────────────────────────
  const severityOptions: { value: EczemaSeverity; label: string; desc: string; border: string; bg: string }[] = [
    { value: 'mild',     ...commonStrings.onboarding.severityOptions.mild,     border: 'border-l-4 border-success', bg: 'bg-success/10' },
    { value: 'moderate', ...commonStrings.onboarding.severityOptions.moderate, border: 'border-l-4 border-warning', bg: 'bg-warning/10' },
    { value: 'severe',   ...commonStrings.onboarding.severityOptions.severe,   border: 'border-l-4 border-danger',  bg: 'bg-danger/10'  },
  ];

  // ── Navigation ────────────────────────────────────────────
  let returnToSummary = $state(false);
  let saveError = $state<string | null>(null);

  function next() {
    if (returnToSummary) {
      step = TOTAL_STEPS;
      returnToSummary = false;
      return;
    }
    if (step < TOTAL_STEPS) step++;
  }

  function back() {
    if (step > 1) step--;
  }

  function editStep(n: number) {
    returnToSummary = true;
    step = n;
  }

  function canAdvance(): boolean {
    if (step === 2) return !!babyBirthDate;
    return true;
  }

  // ── Save & proceed ────────────────────────────────────────
  async function confirm() {
    saveError = null;
    const answers: QuestionnaireAnswers = $state.snapshot({
      babyBirthDate,
      eczemaSeverity: severity,
      motherAllergies,
      babyConfirmedAllergies: babyAllergies,
      programStartDate,
      completedAt: new Date().toISOString(),
      testedAllergens: DEFAULT_TESTED_ALLERGENS,
    });
    const schedule = generateSchedule(answers);
    const saveAnswers = await questionnaireRepo.save(answers);
    if (!saveAnswers.ok) { saveError = saveAnswers.error; return; }
    const saveSchedule = await scheduleRepo.save(schedule);
    if (!saveSchedule.ok) { saveError = saveSchedule.error; return; }
    goto('/today');
  }

  // ── Summary helpers ───────────────────────────────────────
  function formatBabyAge(): string {
    if (!babyBirthDate) return '—';
    const birth = new Date(babyBirthDate + 'T00:00:00');
    const now = new Date();
    const weeks = Math.floor((now.getTime() - birth.getTime()) / (7 * 86400000));
    if (weeks < 8) return tyzdnyCs(weeks);
    const months = Math.floor(weeks / 4.33);
    return mesiceCs(months);
  }

  // Count unique allergen categories (not individual sub-item slugs).
  // Custom slugs (other:Name) each count as their own entry — not collapsed.
  function affectedCategoryCount(slugs: string[]): number {
    return new Set(slugs.map(s => s.startsWith('other:') ? s : s.split(':')[0])).size;
  }

  function slugsToNames(slugs: string[]): string {
    if (slugs.length === 0) return commonStrings.settings.noneLabel;
    return slugs.map(s => {
      if (s.startsWith('other:')) return s.slice(6);
      if (s.includes(':')) {
        return subitemStrings[s as SubitemId] ?? s.split(':')[1];
      }
      return categoryStrings[s as ProtocolAllergenId]?.name ?? s;
    }).join(', ');
  }
</script>

<div class="min-h-screen bg-surface flex flex-col">
  <!-- Progress bar -->
  {#if step > 1 && step < TOTAL_STEPS}
    <ProgressBar value={progress} />
  {/if}

  <!-- Back button -->
  {#if step > 1}
    <button
      class="self-start m-4 mb-0 body-muted flex items-center gap-1 hover:text-text"
      onclick={back}
    >
      {actionStrings.backArrow}
    </button>
  {/if}

  <div class="flex-1 flex flex-col w-full page-container pb-8">

    <!-- ═══ Step 1: Welcome ═══ -->
    {#if step === 1}
      <div class="flex-1 flex flex-col items-center justify-center text-center gap-6">
        <div class="text-7xl">🌿</div>
        <div>
          <h1 class="page-heading mb-3">{commonStrings.onboarding.heading}</h1>
          <p class="text-text-muted leading-relaxed">
            {commonStrings.onboarding.introLine1}
            {commonStrings.onboarding.introLine2}
          </p>
        </div>
        <div class="card-base w-full text-left space-y-2">
          <p class="body-medium">{commonStrings.onboarding.whatsNext}</p>
          {#each commonStrings.onboarding.steps as item}
            <div class="flex items-start gap-2 body-muted">
              <span class="text-success mt-0.5">✓</span>
              <span>{item}</span>
            </div>
          {/each}
        </div>
        <Button onclick={next}>{actionStrings.start}</Button>
      </div>

    <!-- ═══ Step 2: Baby info ═══ -->
    {:else if step === 2}
      <div class="flex-1 flex flex-col justify-center gap-6">
        <div>
          <h2 class="card-heading">{commonStrings.onboarding.step2Heading}</h2>
          <p class="body-muted">{commonStrings.onboarding.step2Subtitle}</p>
        </div>

        <FormInput
          id="birthdate"
          label={commonStrings.onboarding.birthdateLabel}
          type="date"
          bind:value={babyBirthDate}
          max={new Date().toISOString().split('T')[0]}
        />

        <div>
          <p class="body-medium mb-3">{commonStrings.onboarding.severityQuestion}</p>
          <div class="space-y-3">
            {#each severityOptions as opt}
              <button
                type="button"
                class="w-full text-left rounded-2xl border-2 p-4 transition-all
                  {severity === opt.value ? opt.border + ' ' + opt.bg + ' shadow-sm' : 'border-surface-dark bg-white'}"
                onclick={() => (severity = opt.value)}
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-semibold text-text">{opt.label}</p>
                    <p class="body-muted mt-0.5">{opt.desc}</p>
                  </div>
                  {#if severity === opt.value}
                    <span class="text-primary text-xl">●</span>
                  {:else}
                    <span class="text-surface-dark text-xl">○</span>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        </div>

        <div class="mt-auto">
          <p class="body-muted mb-1 text-center">
            {commonStrings.onboarding.severityHint}
          </p>
          <Button onclick={next} disabled={!canAdvance()}>{actionStrings.continue}</Button>
        </div>
      </div>

    <!-- ═══ Step 3: Mother's allergies ═══ -->
    {:else if step === 3}
      <div class="flex-1 flex flex-col gap-5">
        <div>
          <h2 class="card-heading">{commonStrings.onboarding.step3Heading}</h2>
          <p class="body-muted">
            {commonStrings.onboarding.step3Subtitle}
          </p>
        </div>

        <InfoBanner variant="info">
          <p class="body">{@html commonStrings.onboarding.step3InfoHtml}</p>
        </InfoBanner>

        <CategoryGrid bind:selected={motherAllergies} variant="primary" expandable={true} />

        <div class="mt-auto space-y-2">
          <Button onclick={next}>
            {motherAllergies.length > 0 ? `${actionStrings.continue} (${affectedCategoryCount(motherAllergies)} ${allergenWordCs(affectedCategoryCount(motherAllergies))})` : actionStrings.continue}
          </Button>
          {#if motherAllergies.length === 0}
            <button class="w-full py-2 body-muted" onclick={next}>
              {actionStrings.noAllergy}
            </button>
          {/if}
        </div>
      </div>

    <!-- ═══ Step 4: Baby's confirmed allergies ═══ -->
    {:else if step === 4}
      <div class="flex-1 flex flex-col gap-5">
        <div>
          <h2 class="card-heading">{commonStrings.onboarding.step4Heading}</h2>
          <p class="body-muted">
            {commonStrings.onboarding.step4Subtitle}
          </p>
        </div>

        <InfoBanner variant="danger">
          <p class="body">{@html commonStrings.onboarding.step4InfoHtml}</p>
        </InfoBanner>

        <CategoryGrid
          bind:selected={babyAllergies}
          variant="danger"
          expandable={true}
        />

        <div class="mt-auto space-y-2">
          <Button onclick={next}>
            {babyAllergies.length > 0 ? `${actionStrings.continue} (${affectedCategoryCount(babyAllergies)} ${allergenWordCs(affectedCategoryCount(babyAllergies))})` : actionStrings.continue}
          </Button>
          {#if babyAllergies.length === 0}
            <button class="w-full py-2 body-muted" onclick={next}>
              {actionStrings.noConfirmedAllergy}
            </button>
          {/if}
        </div>
      </div>

    <!-- ═══ Step 5: Program start date ═══ -->
    {:else if step === 5}
      <div class="flex-1 flex flex-col justify-center gap-6">
        <div>
          <h2 class="card-heading">{commonStrings.onboarding.step5Heading}</h2>
          <p class="body-muted">{commonStrings.onboarding.step5Subtitle}</p>
        </div>

        <FormInput
          id="startdate"
          label={commonStrings.onboarding.startDateLabel}
          type="date"
          bind:value={programStartDate}
          min={new Date().toISOString().split('T')[0]}
        />

        <InfoBanner variant="info">
          <p class="body leading-relaxed">{@html commonStrings.onboarding.step5InfoHtml}</p>
        </InfoBanner>

        <div class="mt-auto">
          <Button onclick={next}>{actionStrings.continue}</Button>
        </div>
      </div>

    <!-- ═══ Step 6: Summary ═══ -->
    {:else if step === 6}
      <div class="flex-1 flex flex-col gap-5">
        <div>
          <h2 class="card-heading">{commonStrings.onboarding.step6Heading}</h2>
          <p class="body-muted">{commonStrings.onboarding.step6Subtitle}</p>
        </div>

        <!-- Summary cards -->
        <div class="space-y-3">
          <SummaryCard label={commonStrings.onboarding.summaryBabyLabel} onEdit={() => editStep(2)}>
            <p class="body">{commonStrings.onboarding.summaryAge}: <strong>{formatBabyAge()}</strong></p>
            <p class="body mt-0.5">
              {commonStrings.onboarding.summarySeverity}: <strong>{severityOptions.find(s => s.value === severity)?.label}</strong>
            </p>
          </SummaryCard>

          <SummaryCard label={commonStrings.onboarding.summaryMotherLabel} onEdit={() => editStep(3)}>
            <p class="body">{slugsToNames(motherAllergies)}</p>
          </SummaryCard>

          <SummaryCard label={commonStrings.onboarding.summaryBabyAllergiesLabel} onEdit={() => editStep(4)}>
            <p class="body">{slugsToNames(babyAllergies)}</p>
          </SummaryCard>

          <InfoBanner variant="info">
            <div class="flex items-center justify-between mb-2">
              <p class="section-label text-primary mb-0">Program</p>
              <button class="text-xs text-primary" onclick={() => editStep(5)}>{commonStrings.onboarding.summaryEdit}</button>
            </div>
            <p class="body mb-2">{commonStrings.onboarding.summaryStart}: <strong>{formatDateLongCs(programStartDate)}</strong></p>
            <div class="body space-y-1">
              <p>✦ <strong>5 dní</strong> {phaseStrings.reset.label}</p>
              <p>✦ <strong>{elimDays} dní</strong> {phaseStrings.elimination.label}</p>
              {#if reintroQueue.length > 0}
                <p>✦ {commonStrings.onboarding.summaryReintroPrefix} (<strong>{reintroDays} dní</strong> každý):
                  {reintroQueue.map(s => categoryStrings[s as ProtocolAllergenId]?.name ?? s).join(' → ')}
                </p>
              {:else}
                <p>✦ {@html commonStrings.onboarding.summaryNoReintroHtml}</p>
              {/if}
            </div>
          </InfoBanner>
        </div>

        <div class="mt-auto">
          {#if saveError}
            <ErrorAlert message={saveError} />
          {/if}
          <Button onclick={confirm}>{actionStrings.confirm}</Button>
        </div>
      </div>
    {/if}

  </div>
</div>
