<script lang="ts">
  // ═══════════════════════════════════════════════════════════
  // V2 Prototype — Onboarding Questionnaire (5 steps)
  // ═══════════════════════════════════════════════════════════
  import { goto } from '$app/navigation';
  import FamilyGrid from '$lib/components/FamilyGrid.svelte';
  import AllergenDrillIn from '$lib/components/AllergenDrillIn.svelte';
  import FormInput from '$lib/components/form-input.svelte';
  import ErrorAlert from '$lib/components/error-alert.svelte';
  import InfoBanner from '$lib/components/InfoBanner.svelte';
  import QuestionnaireSummaryRow from '$lib/components/QuestionnaireSummaryRow.svelte';
  import ProgressBar from '$lib/components/ProgressBar.svelte';
  import Button from '$lib/components/Button.svelte';
  import type { EczemaSeverity, QuestionnaireAnswers } from '$lib/domain/models';
  import { DEFAULT_TESTED_ALLERGENS } from '$lib/domain/policy';
  import { categoryStrings, subitemStrings } from '$lib/strings/categories';
  import { actionStrings } from '$lib/strings/actions';
  import { commonStrings, allergenWordCs } from '$lib/strings/common';
  import type { AllergenId, LadderAllergenId } from '$lib/domain/models';
  import { formatDateLongCs, todayIso } from '$lib/utils/date';
  import { generateSchedule } from '$lib/domain/schedule-builder';
  import { protocolSession } from '$lib/stores/protocol-session';
  import { singleAllergenFamily } from '$lib/data/allergen-catalog';
  import { ALLERGENS } from '$lib/data/allergen-catalog';
  import type { FamilyId } from '$lib/data/allergen-catalog';

  // ── Form state ────────────────────────────────────────────
  let step = $state(1);
  const TOTAL_STEPS = 6;

  let babyBirthDate = $state('');
  let severity = $state<EczemaSeverity>('moderate');
  let motherAllergies = $state<string[]>([]);
  let babyAllergies = $state<string[]>([]);
  let programStartDate = $state(new Date().toISOString().split('T')[0]);

  // Drill-in state for steps 3 and 4
  let motherDrillFamily = $state<FamilyId | null>(null);
  let babyDrillFamily = $state<FamilyId | null>(null);

  function handleMotherFamilySelect(familyId: FamilyId) {
    const single = singleAllergenFamily(familyId);
    if (single !== null) {
      // Toggle directly — no drill needed
      if (motherAllergies.includes(single)) {
        motherAllergies = motherAllergies.filter((a) => a !== single);
      } else {
        motherAllergies = [...motherAllergies, single];
      }
    } else {
      motherDrillFamily = familyId;
    }
  }

  function handleBabyFamilySelect(familyId: FamilyId) {
    const single = singleAllergenFamily(familyId);
    if (single !== null) {
      if (babyAllergies.includes(single)) {
        babyAllergies = babyAllergies.filter((a) => a !== single);
      } else {
        babyAllergies = [...babyAllergies, single];
      }
    } else {
      babyDrillFamily = familyId;
    }
  }

  const progress = $derived(((step - 1) / (TOTAL_STEPS - 1)) * 100);

  // Maps allergen ids to their family — used to highlight families in FamilyGrid
  function familiesForAllergens(allergenIds: string[]): FamilyId[] {
    const families = new Set<FamilyId>();
    for (const id of allergenIds) {
      const rec = ALLERGENS.find((a) => a.id === id);
      if (rec) families.add(rec.familyId as FamilyId);
    }
    return [...families];
  }

  const motherActiveFamilies = $derived(familiesForAllergens(motherAllergies));
  const babyActiveFamilies = $derived(familiesForAllergens(babyAllergies));

  const summaryEndDate = $derived.by(() => {
    if (!babyBirthDate || !programStartDate) return '—';
    const schedule = generateSchedule({
      babyBirthDate,
      eczemaSeverity: severity,
      // The onboarding UI collects allergen slugs as plain strings; every value
      // originates from the catalog (CatalogAllergenId) or an `other:` custom id,
      // so it is a valid AllergenId at this domain boundary.
      motherAllergies: motherAllergies as AllergenId[],
      babyConfirmedAllergies: babyAllergies as AllergenId[],
      programStartDate,
      completedAt: new Date().toISOString(),
      testedAllergens: DEFAULT_TESTED_ALLERGENS,
    });
    return formatDateLongCs(schedule.estimatedEndDate);
  });

  // ── Severity options ──────────────────────────────────────
  const severityOptions: {
    value: EczemaSeverity;
    label: string;
    desc: string;
    border: string;
    bg: string;
  }[] = [
    {
      value: 'mild',
      ...commonStrings.onboarding.severityOptions.mild,
      border: 'border-l-4 border-success',
      bg: 'bg-success/10',
    },
    {
      value: 'moderate',
      ...commonStrings.onboarding.severityOptions.moderate,
      border: 'border-l-4 border-warning',
      bg: 'bg-warning/10',
    },
    {
      value: 'severe',
      ...commonStrings.onboarding.severityOptions.severe,
      border: 'border-l-4 border-danger',
      bg: 'bg-danger/10',
    },
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
      // See the boundary note above: UI-collected slugs are valid AllergenIds.
      motherAllergies: motherAllergies as AllergenId[],
      babyConfirmedAllergies: babyAllergies as AllergenId[],
      programStartDate,
      completedAt: new Date().toISOString(),
      testedAllergens: DEFAULT_TESTED_ALLERGENS,
    });
    const result = await protocolSession.startProtocol(answers);
    if (!result.ok) {
      saveError = result.error;
      return;
    }
    goto(`/day/${todayIso()}`);
  }

  // Count unique allergen categories (not individual sub-item slugs).
  // Custom slugs (other:Name) each count as their own entry — not collapsed.
  function affectedCategoryCount(slugs: string[]): number {
    return new Set(slugs.map((s) => (s.startsWith('other:') ? s : s.split(':')[0]))).size;
  }

  function slugsToNames(slugs: string[]): string {
    if (slugs.length === 0) return commonStrings.onboarding.noneLabel;
    return slugs
      .map((s) => {
        if (s.startsWith('other:')) return s.slice(6);
        if (s.includes(':')) {
          return (subitemStrings as Record<string, string>)[s] ?? s.split(':')[1];
        }
        return categoryStrings[s as LadderAllergenId]?.name ?? s;
      })
      .join(', ');
  }
</script>

<div class="bg-surface flex min-h-screen flex-col">
  <!-- Progress bar -->
  {#if step > 1 && step < TOTAL_STEPS}
    <ProgressBar value={progress} />
  {/if}

  <!-- Back button -->
  {#if step > 1}
    <button
      class="body-muted hover:text-text m-4 mb-0 flex items-center gap-1 self-start"
      onclick={back}
    >
      {actionStrings.backArrow}
    </button>
  {/if}

  <div class="page-container flex w-full flex-1 flex-col pb-8">
    <!-- ═══ Step 1: Welcome ═══ -->
    {#if step === 1}
      <div class="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div class="text-7xl">🌿</div>
        <div>
          <h1 class="page-heading mb-3">{commonStrings.onboarding.heading}</h1>
          <p class="text-text-muted leading-relaxed">
            {commonStrings.onboarding.introLine1}
            {commonStrings.onboarding.introLine2}
          </p>
        </div>
        <div class="card-base w-full space-y-2 text-left">
          <p class="body-medium">{commonStrings.onboarding.whatsNext}</p>
          {#each commonStrings.onboarding.steps as item}
            <div class="body-muted flex items-start gap-2">
              <span class="text-success mt-0.5">✓</span>
              <span>{item}</span>
            </div>
          {/each}
        </div>
        <Button onclick={next}>{actionStrings.start}</Button>
      </div>

      <!-- ═══ Step 2: Baby info ═══ -->
    {:else if step === 2}
      <div class="flex flex-1 flex-col justify-center gap-6">
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
                class="w-full rounded-2xl border-2 p-4 text-left transition-all
                  {severity === opt.value
                  ? opt.border + ' ' + opt.bg + ' shadow-sm'
                  : 'border-surface-dark bg-white'}"
                onclick={() => (severity = opt.value)}
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-text font-semibold">{opt.label}</p>
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
      <div class="flex flex-1 flex-col gap-5">
        {#if motherDrillFamily === null}
          <div>
            <h2 class="card-heading">{commonStrings.onboarding.step3Heading}</h2>
            <p class="body-muted">
              {commonStrings.onboarding.step3Subtitle}
            </p>
          </div>

          <InfoBanner variant="info">
            <!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted static UI string from $lib/strings, never user input -->
            <p class="body">{@html commonStrings.onboarding.step3InfoHtml}</p>
          </InfoBanner>

          <FamilyGrid onSelect={handleMotherFamilySelect} activeFamilyIds={motherActiveFamilies} />

          <div class="mt-auto space-y-2">
            <Button onclick={next}>
              {motherAllergies.length > 0
                ? `${actionStrings.continue} (${affectedCategoryCount(motherAllergies)} ${allergenWordCs(affectedCategoryCount(motherAllergies))})`
                : actionStrings.continue}
            </Button>
            {#if motherAllergies.length === 0}
              <button class="body-muted w-full py-2" onclick={next}>
                {actionStrings.noAllergy}
              </button>
            {/if}
          </div>
        {:else}
          <AllergenDrillIn
            familyId={motherDrillFamily}
            bind:selected={motherAllergies}
            variant="primary"
            onBack={() => (motherDrillFamily = null)}
          />
          <div class="mt-auto px-4">
            <Button onclick={() => (motherDrillFamily = null)}>{actionStrings.done}</Button>
          </div>
        {/if}
      </div>

      <!-- ═══ Step 4: Baby's confirmed allergies ═══ -->
    {:else if step === 4}
      <div class="flex flex-1 flex-col gap-5">
        {#if babyDrillFamily === null}
          <div>
            <h2 class="card-heading">{commonStrings.onboarding.step4Heading}</h2>
            <p class="body-muted">
              {commonStrings.onboarding.step4Subtitle}
            </p>
          </div>

          <InfoBanner variant="danger">
            <!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted static UI string from $lib/strings, never user input -->
            <p class="body">{@html commonStrings.onboarding.step4InfoHtml}</p>
          </InfoBanner>

          <FamilyGrid onSelect={handleBabyFamilySelect} activeFamilyIds={babyActiveFamilies} />

          <div class="mt-auto space-y-2">
            <Button onclick={next}>
              {babyAllergies.length > 0
                ? `${actionStrings.continue} (${affectedCategoryCount(babyAllergies)} ${allergenWordCs(affectedCategoryCount(babyAllergies))})`
                : actionStrings.continue}
            </Button>
            {#if babyAllergies.length === 0}
              <button class="body-muted w-full py-2" onclick={next}>
                {actionStrings.noConfirmedAllergy}
              </button>
            {/if}
          </div>
        {:else}
          <AllergenDrillIn
            familyId={babyDrillFamily}
            bind:selected={babyAllergies}
            variant="danger"
            onBack={() => (babyDrillFamily = null)}
          />
          <div class="mt-auto px-4">
            <Button onclick={() => (babyDrillFamily = null)}>{actionStrings.done}</Button>
          </div>
        {/if}
      </div>

      <!-- ═══ Step 5: Program start date ═══ -->
    {:else if step === 5}
      <div class="flex flex-1 flex-col justify-center gap-6">
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
          <!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted static UI string from $lib/strings, never user input -->
          <p class="body leading-relaxed">{@html commonStrings.onboarding.step5InfoHtml}</p>
        </InfoBanner>

        <div class="mt-auto">
          <Button onclick={next}>{actionStrings.continue}</Button>
        </div>
      </div>

      <!-- ═══ Step 6: Summary ═══ -->
    {:else if step === 6}
      <div class="flex flex-1 flex-col gap-5">
        <div>
          <h2 class="card-heading">{commonStrings.onboarding.step6Heading}</h2>
          <p class="body-muted">{commonStrings.onboarding.step6Subtitle}</p>
        </div>

        <!-- Summary rows -->
        <div class="space-y-3">
          <QuestionnaireSummaryRow
            label={commonStrings.onboarding.summaryBirthLabel}
            value={formatDateLongCs(babyBirthDate)}
            onEdit={() => editStep(2)}
          />
          <QuestionnaireSummaryRow
            label={commonStrings.onboarding.summarySeverityLabel}
            value={severityOptions.find((s) => s.value === severity)?.label ?? ''}
            onEdit={() => editStep(2)}
          />
          <QuestionnaireSummaryRow
            label={commonStrings.onboarding.summaryMotherLabel}
            value={slugsToNames(motherAllergies)}
            onEdit={() => editStep(3)}
          />
          <QuestionnaireSummaryRow
            label={commonStrings.onboarding.summaryBabyAllergiesLabel}
            value={slugsToNames(babyAllergies)}
            onEdit={() => editStep(4)}
          />
          <QuestionnaireSummaryRow
            label={commonStrings.onboarding.summaryStartEndLabel}
            value="{formatDateLongCs(programStartDate)} – {summaryEndDate}"
            onEdit={() => editStep(5)}
          />
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
