<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { useRegisterSW } from 'virtual:pwa-register/svelte';

  useRegisterSW({ immediate: true });
  import { goto } from '$app/navigation';
  import { questionnaireStore } from '$lib/stores/questionnaire';

  let { children } = $props();

  const answers = $derived($questionnaireStore);
  const currentPath = $derived($page.url.pathname);
  const isOnboarding = $derived(currentPath === '/');
  const isDetailScreen = $derived(
    currentPath.startsWith('/meal') || currentPath.startsWith('/settings')
  );
  const showNav = $derived(!isOnboarding && !!answers && !isDetailScreen);
  const dnesActive = $derived(currentPath.startsWith('/today'));

  $effect(() => {
    if (answers === undefined) return;
    if (answers === null && !isOnboarding) goto('/');
  });
</script>

<div class="h-dvh flex flex-col bg-surface">
  <main class="flex-1 min-h-0 overflow-y-auto">
    {@render children()}
  </main>

  {#if showNav}
    <nav class="bg-white border-t border-surface-dark pt-2 pb-5 shrink-0">
      <div class="grid grid-cols-3 items-end max-w-lg mx-auto">
        <a
          href="/today"
          class="flex flex-col items-center gap-0.5 {dnesActive ? 'text-primary' : 'text-text-muted'}"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12 12 3l9 9"/><path d="M5 10v10h14V10"/>
          </svg>
          <span class="text-[10px] {dnesActive ? 'font-semibold' : ''}">Dnes</span>
        </a>
        <div class="flex justify-center">
          <button
            class="-mt-7 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center text-3xl font-light ring-4 ring-primary/20"
            aria-label="Přidat záznam"
          >+</button>
        </div>
        <a
          href="/week"
          class="flex flex-col items-center gap-0.5 {!dnesActive ? 'text-primary' : 'text-text-muted'}"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>
          </svg>
          <span class="text-[10px] {!dnesActive ? 'font-semibold' : ''}">Týden</span>
        </a>
      </div>
    </nav>
  {/if}
</div>
