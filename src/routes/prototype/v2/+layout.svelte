<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import type { PrototypeState } from './_lib/types';
  import { getPhaseForDate } from './_lib/schedule-engine';
  import { todayIso, addDays, formatDateCs } from './_lib/data';

  let { children } = $props();

  const STATE_KEY = 'v2-prototype-state';

  function loadState(): PrototypeState {
    if (typeof localStorage === 'undefined') return { answers: null, schedule: null, meals: [], assessments: [], evaluations: [] };
    try {
      return JSON.parse(localStorage.getItem(STATE_KEY) ?? 'null') ?? { answers: null, schedule: null, meals: [], assessments: [], evaluations: [] };
    } catch {
      return { answers: null, schedule: null, meals: [], assessments: [], evaluations: [] };
    }
  }

  let protoState = $state<PrototypeState>({ answers: null, schedule: null, meals: [], assessments: [], evaluations: [] });
  let currentPath = $derived($page.url.pathname);

  onMount(() => {
    protoState = loadState();
    if (!protoState.answers && !currentPath.endsWith('/prototype/v2')) {
      goto('/prototype/v2');
    }
    // Keep layout state in sync when other pages modify localStorage
    function syncState() {
      protoState = loadState();
    }
    window.addEventListener('v2-state-change', syncState);
    return () => window.removeEventListener('v2-state-change', syncState);
  });

  const isOnboarding = $derived(currentPath === '/prototype/v2' || currentPath === '/prototype/v2/');
  const isProgram = $derived(currentPath.startsWith('/prototype/v2/program'));
  const isDay = $derived(currentPath.startsWith('/prototype/v2/day'));
  const isMeal = $derived(currentPath.startsWith('/prototype/v2/meal'));
  const isSettings = $derived(currentPath.startsWith('/prototype/v2/settings'));

  // Date simulation
  const dateOffset = $derived(protoState.dateOffset ?? 0);
  const currentDate = $derived(addDays(todayIso(), dateOffset));
  const simulatedPhase = $derived(
    protoState.schedule ? getPhaseForDate(protoState.schedule, currentDate) : null
  );

  // Always reload fresh from localStorage before mutating — prevents stale overwrites
  function freshState(): PrototypeState {
    return loadState();
  }

  function saveAndNotify(updated: PrototypeState) {
    protoState = updated;
    localStorage.setItem(STATE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('v2-state-change'));
  }

  function adjustOffset(delta: number) {
    const current = freshState();
    saveAndNotify({ ...current, dateOffset: (current.dateOffset ?? 0) + delta });
  }

  function resetOffset() {
    const current = freshState();
    let newOffset = 0;
    if (current.schedule) {
      const realToday = todayIso();
      const target = addDays(current.schedule.startDate, -1);
      newOffset = Math.round((new Date(target + 'T00:00:00').getTime() - new Date(realToday + 'T00:00:00').getTime()) / 86400000);
    }
    saveAndNotify({ ...current, dateOffset: newOffset });
  }

  function jumpToEnd() {
    const current = freshState();
    if (!current.schedule) return;
    const end = current.schedule.estimatedEndDate;
    const realToday = todayIso();
    const newOffset = Math.round((new Date(end + 'T00:00:00').getTime() - new Date(realToday + 'T00:00:00').getTime()) / 86400000) + 2;
    saveAndNotify({ ...current, dateOffset: newOffset });
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
              href="/prototype/v2/program"
              class="px-3 py-1.5 rounded-md text-xs font-medium transition-all
                {isProgram ? 'bg-white text-primary shadow-sm' : 'text-text-muted'}"
            >
              📅 Program
            </a>
            <a
              href="/prototype/v2/day"
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
          href="/prototype/v2/settings"
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

  <!-- Floating date simulation panel (dev only, hidden during onboarding) -->
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
    </div>
  {/if}
</div>
