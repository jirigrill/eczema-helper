<script lang="ts">
  // ═══════════════════════════════════════════════════════════
  // V2 Prototype — Settings (reset + current answers summary)
  // ═══════════════════════════════════════════════════════════
  import { goto } from '$app/navigation';
  import { getCategoryById } from '$lib/data/categories';
  import { formatDateLongCs } from '$lib/utils/date';
  import { db } from '$lib/db/atopic-db';
  import { scheduleContext } from '$lib/stores/schedule-context';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import SummaryCard from '$lib/components/SummaryCard.svelte';
  import Button from '$lib/components/Button.svelte';

  const ctx = $derived($scheduleContext);
  const answers = $derived(ctx.status === 'ready' ? ctx.answers : null);
  const schedule = $derived(ctx.status === 'ready' ? ctx.schedule : null);

  const severityLabel: Record<string, string> = {
    mild: 'Mírná',
    moderate: 'Střední',
    severe: 'Těžká',
  };

  function slugsToNames(slugs: string[]): string {
    if (slugs.length === 0) return 'žádné';
    return slugs.map(s => s.startsWith('other:') ? s.slice(6) : (getCategoryById(s)?.nameCs ?? s)).join(', ');
  }

  async function resetPrototype() {
    await Promise.all([db.answers.clear(), db.schedule.clear()]);
    goto('/');
  }
</script>

<div class="max-w-lg mx-auto">
  <PageHeader title="Nastavení" onBack={() => history.back()} />

<div class="px-4 pt-5 pb-10 space-y-5 flex flex-col">

  <div>
    <h2 class="text-lg font-semibold text-text">Nastavení prototypu</h2>
    <p class="body-muted">Souhrn aktuální konfigurace a možnost restartu</p>
  </div>

  {#if answers}
    <!-- Current answers summary -->
    <div class="space-y-3">
      <p class="section-label mb-0">Aktuální konfigurace</p>

      <SummaryCard label="Miminko">
        <p class="body">
          Narozeno: <strong>{formatDateLongCs(answers.babyBirthDate)}</strong>
        </p>
        <p class="body mt-0.5">
          Závažnost ekzému: <strong>{severityLabel[answers.eczemaSeverity]}</strong>
        </p>
      </SummaryCard>

      <SummaryCard label="Moje alergie">
        <p class="body">{slugsToNames(answers.motherAllergies)}</p>
      </SummaryCard>

      <SummaryCard label="Potvrzené alergie miminka">
        <p class="body">{slugsToNames(answers.babyConfirmedAllergies)}</p>
      </SummaryCard>

      {#if schedule}
        <SummaryCard label="Program">
          <p class="body">
            Celkem {schedule.phases.length} fází ·
            do {formatDateLongCs(schedule.estimatedEndDate)}
          </p>
          <p class="body mt-0.5">
            Zapsáno jídel: <strong>0</strong>
          </p>
        </SummaryCard>
      {/if}
    </div>
  {:else}
    <p class="body-muted">Dotazník ještě nebyl vyplněn.</p>
  {/if}

  <!-- Reset -->
  <div class="pt-4 border-t border-surface-dark space-y-3">
    <p class="body-muted">
      Restartování vymaže všechna uložená data (jídla, harmonogram, odpovědi) a vrátí tě na začátek dotazníku.
    </p>
    <Button color="danger" onclick={resetPrototype}>Restartovat dotazník</Button>
  </div>
</div>
</div>
