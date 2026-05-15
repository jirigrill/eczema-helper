<script lang="ts">
  // ═══════════════════════════════════════════════════════════
  // V2 Prototype — Settings (reset + current answers summary)
  // ═══════════════════════════════════════════════════════════
  import { goto } from '$app/navigation';
  import { getCategoryById } from '$lib/data/categories';
  import { formatDateLongCs } from '$lib/utils/date';
  import { db } from '$lib/db/atopic-db';
  import { scheduleContext } from '$lib/stores/schedule-context';

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
  <div class="px-4 pt-4 pb-3 sticky top-0 bg-surface z-20 border-b border-surface-dark flex items-center gap-3">
    <button class="text-text text-lg leading-none" onclick={() => history.back()}>‹</button>
    <h1 class="text-sm font-bold text-text">Nastavení</h1>
  </div>

<div class="px-4 pt-5 pb-10 space-y-5 flex flex-col">

  <div>
    <h2 class="text-lg font-semibold text-text">Nastavení prototypu</h2>
    <p class="text-sm text-text-muted">Souhrn aktuální konfigurace a možnost restartu</p>
  </div>

  {#if answers}
    <!-- Current answers summary -->
    <div class="space-y-3">
      <p class="text-xs font-semibold text-text-muted uppercase tracking-wide">Aktuální konfigurace</p>

      <div class="bg-white rounded-xl border border-surface-dark p-4 space-y-2">
        <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Miminko</p>
        <p class="text-sm text-text">
          Narozeno: <strong>{formatDateLongCs(answers.babyBirthDate)}</strong>
        </p>
        <p class="text-sm text-text">
          Závažnost ekzému: <strong>{severityLabel[answers.eczemaSeverity]}</strong>
        </p>
      </div>

      <div class="bg-white rounded-xl border border-surface-dark p-4">
        <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Moje alergie</p>
        <p class="text-sm text-text">{slugsToNames(answers.motherAllergies)}</p>
      </div>

      <div class="bg-white rounded-xl border border-surface-dark p-4">
        <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Potvrzené alergie miminka</p>
        <p class="text-sm text-text">{slugsToNames(answers.babyConfirmedAllergies)}</p>
      </div>

      {#if schedule}
        <div class="bg-white rounded-xl border border-surface-dark p-4 space-y-1">
          <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Program</p>
          <p class="text-sm text-text">
            Celkem {schedule.phases.length} fází ·
            do {formatDateLongCs(schedule.estimatedEndDate)}
          </p>
          <p class="text-sm text-text">
            Zapsáno jídel: <strong>0</strong>
          </p>
        </div>
      {/if}
    </div>
  {:else}
    <p class="text-sm text-text-muted">Dotazník ještě nebyl vyplněn.</p>
  {/if}

  <!-- Reset -->
  <div class="pt-4 border-t border-surface-dark space-y-3">
    <p class="text-sm text-text-muted">
      Restartování vymaže všechna uložená data (jídla, harmonogram, odpovědi) a vrátí tě na začátek dotazníku.
    </p>
    <button
      class="w-full py-3.5 rounded-xl bg-danger text-white font-semibold text-base"
      onclick={resetPrototype}
    >
      Restartovat dotazník
    </button>
  </div>
</div>
</div>
