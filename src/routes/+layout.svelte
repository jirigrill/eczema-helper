<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { AtopicDb } from '$lib/db/atopic-db';
  import { DexieQuestionnaireRepository } from '$lib/adapters/dexie-questionnaire-repository';
  import { DexieScheduleRepository } from '$lib/adapters/dexie-schedule-repository';
  import type { QuestionnaireAnswers } from '$lib/domain/models';

  let { children } = $props();

  const db = new AtopicDb();
  const questionnaireRepo = new DexieQuestionnaireRepository(db);
  const scheduleRepo = new DexieScheduleRepository(db);

  let answers = $state<QuestionnaireAnswers | null>(null);
  let currentPath = $derived($page.url.pathname);
  const isOnboarding = $derived(currentPath === '/');

  onMount(async () => {
    answers = await questionnaireRepo.load();
    if (!answers && !isOnboarding) {
      goto('/');
    }
  });
</script>

<div class="min-h-screen bg-surface flex flex-col">
  {#if !isOnboarding && answers}
    <header class="sticky top-0 z-30 bg-white border-b border-surface-dark">
      <div class="flex items-center justify-between px-4 py-2.5 max-w-lg mx-auto">
        {#if currentPath.startsWith('/meal') || currentPath.startsWith('/settings')}
          <button
            class="text-sm text-primary font-medium flex items-center gap-1"
            onclick={() => history.back()}
          >
            ← Zpět
          </button>
        {:else}
          <span></span>
        {/if}

        {#if !currentPath.startsWith('/meal') && !currentPath.startsWith('/settings')}
          <div class="flex bg-surface rounded-lg p-0.5 gap-0.5">
            <a
              href="/today"
              class="px-3 py-1.5 rounded-md text-xs font-medium transition-all
                {currentPath.startsWith('/today') ? 'bg-white text-primary shadow-sm' : 'text-text-muted'}"
            >
              📊 Dnes
            </a>
            <a
              href="/program"
              class="px-3 py-1.5 rounded-md text-xs font-medium transition-all
                {currentPath.startsWith('/program') ? 'bg-white text-primary shadow-sm' : 'text-text-muted'}"
            >
              📅 Program
            </a>
          </div>
        {:else}
          <span></span>
        {/if}

        <a
          href="/settings"
          class="text-xl leading-none {currentPath.startsWith('/settings') ? 'text-primary' : 'text-text-muted'}"
          aria-label="Nastavení"
        >⚙️</a>
      </div>
    </header>
  {/if}

  <main class="flex-1">
    {@render children()}
  </main>
</div>
