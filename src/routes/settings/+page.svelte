<script lang="ts">
  // ═══════════════════════════════════════════════════════════
  // V2 Prototype — Settings (reset + current answers summary)
  // ═══════════════════════════════════════════════════════════
  import { goto } from '$app/navigation';
  import { categoryStrings } from '$lib/strings/categories';
  import { actionStrings } from '$lib/strings/actions';
  import { commonStrings, schedulePhaseSummary } from '$lib/strings/common';
  import type { ProtocolAllergenId } from '$lib/domain/models';
  import { formatDateLongCs } from '$lib/utils/date';
  import { protocolSession } from '$lib/stores/protocol-session';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import SummaryCard from '$lib/components/SummaryCard.svelte';
  import Button from '$lib/components/Button.svelte';

  const ctx = $derived($protocolSession);
  const answers = $derived(ctx.status === 'ready' ? ctx.answers : null);
  const schedule = $derived(ctx.status === 'ready' ? ctx.schedule : null);

  const severityLabel = commonStrings.settings.severityLabel;

  function slugsToNames(slugs: string[]): string {
    if (slugs.length === 0) return commonStrings.settings.noneLabel;
    return slugs.map(s => s.startsWith('other:') ? s.slice(6) : (categoryStrings[s as ProtocolAllergenId]?.name ?? s)).join(', ');
  }

  async function resetPrototype() {
    await protocolSession.reset();
    goto('/');
  }
</script>

<div class="max-w-lg mx-auto">
  <PageHeader title={commonStrings.settings.heading} onBack={() => history.back()} />

<div class="px-4 pt-4 pb-10 space-y-5 flex flex-col">

  <div>
    <h2 class="text-lg font-semibold text-text">{commonStrings.settings.prototypeHeading}</h2>
    <p class="body-muted">{commonStrings.settings.prototypeSubtitle}</p>
  </div>

  {#if answers}
    <!-- Current answers summary -->
    <div class="space-y-3">
      <p class="section-label mb-0">{commonStrings.settings.currentConfig}</p>

      <SummaryCard label={commonStrings.onboarding.summaryBabyLabel}>
        <p class="body">
          Narozeno: <strong>{formatDateLongCs(answers.babyBirthDate)}</strong>
        </p>
        <p class="body mt-0.5">
          {commonStrings.onboarding.summarySeverity}: <strong>{severityLabel[answers.eczemaSeverity]}</strong>
        </p>
      </SummaryCard>

      <SummaryCard label={commonStrings.onboarding.summaryMotherLabel}>
        <p class="body">{slugsToNames(answers.motherAllergies)}</p>
      </SummaryCard>

      <SummaryCard label={commonStrings.onboarding.summaryBabyAllergiesLabel}>
        <p class="body">{slugsToNames(answers.babyConfirmedAllergies)}</p>
      </SummaryCard>

      {#if schedule}
        <SummaryCard label={commonStrings.settings.programLabel}>
          <p class="body">
            {schedulePhaseSummary(schedule.phases.length, formatDateLongCs(schedule.estimatedEndDate))}
          </p>
          <p class="body mt-0.5">
            {@html commonStrings.settings.mealsCountHtml}
          </p>
        </SummaryCard>
      {/if}
    </div>
  {:else}
    <p class="body-muted">{commonStrings.settings.noAnswers}</p>
  {/if}

  <!-- Reset -->
  <div class="pt-4 border-t border-surface-dark space-y-3">
    <p class="body-muted">
      {commonStrings.settings.resetWarning}
    </p>
    <Button color="danger" onclick={resetPrototype}>{actionStrings.restart}</Button>
  </div>
</div>
</div>
