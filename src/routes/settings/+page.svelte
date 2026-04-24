<script lang="ts">
  // ═══════════════════════════════════════════════════════════
  // V2 Prototype — Settings (reset + current answers summary)
  // ═══════════════════════════════════════════════════════════
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import type { AppState } from '$lib/domain/models';
  import { getCategoryBySlug } from '$lib/data/categories';
  import { formatDateLongCs } from '$lib/utils/date';

  const STATE_KEY = 'v2-prototype-state';

  let state = $state<AppState>({ answers: null, schedule: null, meals: [], assessments: [], evaluations: [] });

  onMount(() => {
    try {
      state = JSON.parse(localStorage.getItem(STATE_KEY) ?? 'null') ?? { answers: null, schedule: null, meals: [], assessments: [], evaluations: [] };
    } catch { /* */ }
  });

  const severityLabel: Record<string, string> = {
    mild: 'Mírná',
    moderate: 'Střední',
    severe: 'Těžká',
  };

  function slugsToNames(slugs: string[]): string {
    if (slugs.length === 0) return 'žádné';
    return slugs.map(s => s.startsWith('other:') ? s.slice(6) : (getCategoryBySlug(s)?.nameCs ?? s)).join(', ');
  }

  function resetPrototype() {
    localStorage.removeItem(STATE_KEY);
    goto('/');
  }
</script>

<div class="px-4 pt-5 pb-10 space-y-5 max-w-lg mx-auto min-h-[calc(100dvh-3.5rem)] flex flex-col justify-center">

  <div>
    <h1 class="text-lg font-semibold text-text">Nastavení prototypu</h1>
    <p class="text-sm text-text-muted">Souhrn aktuální konfigurace a možnost restartu</p>
  </div>

  {#if state.answers}
    <!-- Current answers summary -->
    <div class="space-y-3">
      <p class="text-xs font-semibold text-text-muted uppercase tracking-wide">Aktuální konfigurace</p>

      <div class="bg-white rounded-xl border border-surface-dark p-4 space-y-2">
        <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Miminko</p>
        <p class="text-sm text-text">
          Narozeno: <strong>{formatDateLongCs(state.answers.babyBirthDate)}</strong>
        </p>
        <p class="text-sm text-text">
          Závažnost ekzému: <strong>{severityLabel[state.answers.eczemaSeverity]}</strong>
        </p>
      </div>

      <div class="bg-white rounded-xl border border-surface-dark p-4">
        <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Moje alergie</p>
        <p class="text-sm text-text">{slugsToNames(state.answers.motherAllergies)}</p>
      </div>

      <div class="bg-white rounded-xl border border-surface-dark p-4">
        <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Potvrzené alergie miminka</p>
        <p class="text-sm text-text">{slugsToNames(state.answers.babyConfirmedAllergies)}</p>
      </div>

      {#if state.schedule}
        <div class="bg-white rounded-xl border border-surface-dark p-4 space-y-1">
          <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Program</p>
          <p class="text-sm text-text">
            Celkem {state.schedule.phases.length} fází ·
            do {formatDateLongCs(state.schedule.estimatedEndDate)}
          </p>
          <p class="text-sm text-text">
            Zapsáno jídel: <strong>{state.meals.length}</strong>
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
