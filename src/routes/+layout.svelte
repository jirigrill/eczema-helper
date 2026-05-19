<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { useRegisterSW } from 'virtual:pwa-register/svelte';

  useRegisterSW({ immediate: true });
  import { goto } from '$app/navigation';
  import { scheduleContext } from '$lib/stores/schedule-context';
  import TodayIcon from '$lib/components/icons/TodayIcon.svelte';
  import CalendarIcon from '$lib/components/icons/CalendarIcon.svelte';

  let { children } = $props();

  const ctx = $derived($scheduleContext);
  const currentPath = $derived($page.url.pathname);
  const isOnboarding = $derived(currentPath === '/');
  const isDetailScreen = $derived(
    currentPath.startsWith('/meal') || currentPath.startsWith('/settings')
  );
  const showNav = $derived(!isOnboarding && ctx.status === 'ready' && !isDetailScreen);
  const dnesActive = $derived(currentPath.startsWith('/today'));

  $effect(() => {
    if (ctx.status === 'loading') return;
    if (ctx.status === 'empty' && !isOnboarding) goto('/');
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
          <TodayIcon class="w-[22px] h-[22px]" />
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
          <CalendarIcon class="w-[22px] h-[22px]" />
          <span class="text-[10px] {!dnesActive ? 'font-semibold' : ''}">Týden</span>
        </a>
      </div>
    </nav>
  {/if}
</div>
