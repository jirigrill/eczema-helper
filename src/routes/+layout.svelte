<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import type { AppState } from '$lib/domain/models';
  import { getPhaseForDate } from '$lib/domain/schedule';
  import { todayIso, addDays, formatDateCs } from '$lib/utils/date';
  import { fetchScenario, listScenarios } from '$lib/data/scenario-loader';
  import { loadState, saveAndNotify as persistAndNotify } from '$lib/data/storage';

  let { children } = $props();

  let protoState = $state<AppState>({ answers: null, schedule: null, meals: [], assessments: [], evaluations: [] });
  let currentPath = $derived($page.url.pathname);
  let scenarios = $state<{ id: string; name: string }[]>([]);
  let scenarioLoading = $state(false);
  let scenarioError = $state<string | null>(null);

  onMount(() => {
    protoState = loadState();
    if (!protoState.answers && !currentPath.endsWith('/')) {
      goto('/');
    }
    function syncState() {
      protoState = loadState();
    }
    window.addEventListener('v2-state-change', syncState);
    listScenarios().then(list => { scenarios = list; });
    return () => window.removeEventListener('v2-state-change', syncState);
  });

  const isOnboarding = $derived(currentPath === '/' || currentPath === '/');
  const isProgram = $derived(currentPath.startsWith('/program'));
  const isDay = $derived(currentPath.startsWith('/day'));
  const isMeal = $derived(currentPath.startsWith('/meal'));
  const isSettings = $derived(currentPath.startsWith('/settings'));

  // Date simulation
  const dateOffset = $derived(protoState.dateOffset ?? 0);
  const currentDate = $derived(addDays(todayIso(), dateOffset));
  const simulatedPhase = $derived(
    protoState.schedule ? getPhaseForDate(protoState.schedule, currentDate) : null
  );

  function saveAndNotify(updated: AppState) {
    protoState = updated;
    persistAndNotify(updated);
  }

  function adjustOffset(delta: number) {
    const current = loadState();
    saveAndNotify({ ...current, dateOffset: (current.dateOffset ?? 0) + delta });
  }

  function resetOffset() {
    const current = loadState();
    let newOffset = 0;
    if (current.schedule) {
      const realToday = todayIso();
      const target = addDays(current.schedule.startDate, -1);
      newOffset = Math.round((new Date(target + 'T00:00:00').getTime() - new Date(realToday + 'T00:00:00').getTime()) / 86400000);
    }
    saveAndNotify({ ...current, dateOffset: newOffset });
  }

  function jumpToEnd() {
    const current = loadState();
    if (!current.schedule) return;
    const end = current.schedule.estimatedEndDate;
    const realToday = todayIso();
    const newOffset = Math.round((new Date(end + 'T00:00:00').getTime() - new Date(realToday + 'T00:00:00').getTime()) / 86400000) + 2;
    saveAndNotify({ ...current, dateOffset: newOffset });
  }

  async function loadScenario(id: string) {
    scenarioLoading = true;
    scenarioError = null;
    const result = await fetchScenario(id);
    scenarioLoading = false;
    if (!result.ok) {
      scenarioError = result.error;
      return;
    }
    // Auto-reset offset to day before program start so navigation begins at the start
    const state = result.data;
    if (state.schedule) {
      const realToday = todayIso();
      const target = addDays(state.schedule.startDate, -1);
      state.dateOffset = Math.round((new Date(target + 'T00:00:00').getTime() - new Date(realToday + 'T00:00:00').getTime()) / 86400000);
    }
    saveAndNotify(state);
    goto('/program');
  }
</script>

<div class="min-h-screen bg-surface flex flex-col">
  <!-- Header (hidden during onboarding) -->
  {#if !isOnboarding && protoState.answers}
    <header class="sticky top-0 z-30 bg-white border-b border-surface-dark">
      <div class="flex items-center justify-between px-4 py-2.5 max-w-lg mx-auto">
        <!-- Left: back navigation for sub-pages -->
        {#if isMeal || isSettings}
          <button
            class="text-sm text-primary font-medium flex items-center gap-1"
            onclick={() => history.back()}
          >
            ← Zpět
          </button>
        {:else}
          <span class="text-xs text-primary font-medium">V2 Prototyp</span>
        {/if}

        <!-- Center: schedule ↔ day toggle -->
        {#if !isMeal && !isSettings}
          <div class="flex bg-surface rounded-lg p-0.5 gap-0.5">
            <a
              href="/program"
              class="px-3 py-1.5 rounded-md text-xs font-medium transition-all
                {isProgram ? 'bg-white text-primary shadow-sm' : 'text-text-muted'}"
            >
              📅 Program
            </a>
            <a
              href="/day"
              class="px-3 py-1.5 rounded-md text-xs font-medium transition-all
                {isDay ? 'bg-white text-primary shadow-sm' : 'text-text-muted'}"
            >
              📊 Dnes
            </a>
          </div>
        {:else}
          <span></span>
        {/if}

        <!-- Right: settings -->
        <a
          href="/settings"
          class="text-xl leading-none {isSettings ? 'text-primary' : 'text-text-muted'}"
          aria-label="Nastavení"
        >⚙️</a>
      </div>
    </header>
  {/if}

  <!-- Page content -->
  <main class="flex-1">
    {@render children()}
  </main>

  <!-- Floating date simulation panel (dev only) -->
  {#if !isOnboarding && protoState.answers}
    <div
      class="fixed right-3 bottom-3 z-50 bg-white/95 backdrop-blur border border-surface-dark rounded-2xl shadow-sm px-3 py-2 space-y-1.5"
      style:bottom="calc(env(safe-area-inset-bottom, 0px) + 0.75rem)"
    >
      <div class="text-center">
        <p class="text-[10px] text-text-muted leading-none mb-0.5">Simulovaný den</p>
        <p class="text-xs font-bold text-text">{formatDateCs(currentDate)}</p>
        {#if simulatedPhase}
          <p class="text-[10px] text-primary leading-tight max-w-[88px] truncate">{simulatedPhase.label}</p>
        {:else if protoState.schedule && currentDate < protoState.schedule.startDate}
          <p class="text-[10px] text-text-muted">Před startem</p>
        {:else}
          <p class="text-[10px] text-text-muted">Hotovo</p>
        {/if}
      </div>
      <div class="flex items-center gap-1">
        <button
          class="text-sm bg-surface border border-surface-dark rounded-lg px-2.5 py-1 text-text font-bold leading-none"
          onclick={() => adjustOffset(-1)}
          aria-label="Den zpět"
        >«</button>
        <button
          class="text-xs text-text-muted px-2 py-1 rounded-lg border border-surface-dark leading-none"
          onclick={resetOffset}
          aria-label="Start programu"
        >↺</button>
        <button
          class="text-sm bg-surface border border-surface-dark rounded-lg px-2.5 py-1 text-text font-bold leading-none"
          onclick={() => adjustOffset(1)}
          aria-label="Den dopředu"
        >»</button>
      </div>
      {#if protoState.schedule}
        <button
          class="w-full text-xs text-text-muted border border-surface-dark rounded-lg px-2 py-1 leading-none text-center"
          onclick={jumpToEnd}
          aria-label="Přeskočit na konec programu"
        >⏭ Konec</button>
      {/if}

      {#if scenarios.length > 0}
        <div class="border-t border-surface-dark pt-1.5 space-y-1">
          {#if protoState.activeScenario}
            <p class="text-[10px] text-primary leading-none truncate max-w-[88px]">▶ {protoState.activeScenario}</p>
          {/if}
          {#if scenarioError}
            <p class="text-[10px] text-danger leading-tight max-w-[88px]">{scenarioError}</p>
          {/if}
          <select
            class="w-full text-[10px] text-text-muted border border-surface-dark rounded-lg px-1.5 py-1 bg-white leading-none"
            disabled={scenarioLoading}
            onchange={(e) => {
              const id = (e.target as HTMLSelectElement).value;
              if (id) loadScenario(id);
              (e.target as HTMLSelectElement).value = '';
            }}
          >
            <option value="">{scenarioLoading ? 'Načítám…' : 'Načíst scénář…'}</option>
            {#each scenarios as s}
              <option value={s.id}>{s.name}</option>
            {/each}
          </select>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Scenario picker shown on onboarding / no answers state -->
  {#if (isOnboarding || !protoState.answers) && scenarios.length > 0}
    <div
      class="fixed right-3 bottom-3 z-50 bg-white/95 backdrop-blur border border-surface-dark rounded-2xl shadow-sm px-3 py-2 space-y-1"
      style:bottom="calc(env(safe-area-inset-bottom, 0px) + 0.75rem)"
    >
      <p class="text-[10px] text-text-muted leading-none text-center">Dev</p>
      {#if scenarioError}
        <p class="text-[10px] text-danger leading-tight max-w-[88px]">{scenarioError}</p>
      {/if}
      <select
        class="w-full text-[10px] text-text-muted border border-surface-dark rounded-lg px-1.5 py-1 bg-white leading-none"
        disabled={scenarioLoading}
        onchange={(e) => {
          const id = (e.target as HTMLSelectElement).value;
          if (id) loadScenario(id);
          (e.target as HTMLSelectElement).value = '';
        }}
      >
        <option value="">{scenarioLoading ? 'Načítám…' : 'Načíst scénář…'}</option>
        {#each scenarios as s}
          <option value={s.id}>{s.name}</option>
        {/each}
      </select>
    </div>
  {/if}
</div>
