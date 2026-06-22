<script lang="ts">
  import '../app.css';
  import { randomUUID } from '$lib/utils/uuid';
  import { page } from '$app/stores';
  import { useRegisterSW } from 'virtual:pwa-register/svelte';

  useRegisterSW({ immediate: true });
  import { goto } from '$app/navigation';
  import { scheduleContext } from '$lib/stores/schedule-context';
  import TodayIcon from '$lib/components/icons/TodayIcon.svelte';
  import CalendarIcon from '$lib/components/icons/CalendarIcon.svelte';
  import FabActionSheet from '$lib/components/FabActionSheet.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import { commonStrings } from '$lib/strings/common';
  import { todayIso } from '$lib/utils/date';
  import { createSkinPhotoSession } from '$lib/stores/skin-photo-session';
  import { createMealSession } from '$lib/stores/meal-session';
  import type { SkinPhoto, MealType } from '$lib/domain/models';
  import { discardBuffer, clearBuffer } from '$lib/stores/discard-buffer';
  import { pulseRecentreDayStrip } from '$lib/stores/day-strip-recentre';

  let { children } = $props();

  const ctx = $derived($scheduleContext);
  const currentPath = $derived($page.url.pathname);
  const isOnboarding = $derived(currentPath === '/');
  const isDetailScreen = $derived(
    currentPath.startsWith('/meal') || currentPath.startsWith('/settings') || currentPath.startsWith('/skin')
  );
  const isDayRoute = $derived(currentPath.startsWith('/day/'));
  const today = $derived(todayIso());
  // Suppress the FAB on a future day — those days are read-only "Naplánováno"
  // previews and must not expose meal/observation/photo entry points.
  const isFutureDay = $derived(isDayRoute && typeof $page.params.date === 'string' && $page.params.date > today);
  const showNav = $derived(!isOnboarding && ctx.status === 'ready' && !isDetailScreen);
  const showFab = $derived(showNav && !isFutureDay);
  const dnesActive = $derived($page.params.date === today);

  const selectedDate = $derived($page.params.date ?? today);

  // Day-scoped meal session — feeds the Meal-Type FAB Submenu so it can
  // mark already-logged slots with a ✓ for the current `selectedDate`.
  const dayMealSession = $derived(createMealSession(selectedDate));
  const loggedTypes = $derived<MealType[]>($dayMealSession.map((m) => m.mealType));

  let fabOpen = $state(false);

  async function handleFabPhotoCapture(blob: Blob): Promise<void> {
    const session = createSkinPhotoSession(selectedDate);
    const photo: SkinPhoto = {
      id: randomUUID(),
      date: selectedDate,
      capturedAt: new Date().toISOString(),
      blob,
    };
    await session.save(photo);
  }

  function handleDiscardUndo(): void {
    const buf = $discardBuffer;
    if (!buf) return;
    // Don't clearBuffer here — meal page reads + clears it on mount.
    // Only navigate; onClose will be called by Toast after this, but we guard it.
    discardUndoFired = true;
    goto(`/meal?type=${buf.mealType}&date=${buf.date}&returnTo=${encodeURIComponent(buf.returnTo)}`);
  }

  let discardUndoFired = $state(false);

  function handleDiscardClose(): void {
    if (!discardUndoFired) {
      clearBuffer();
    }
    discardUndoFired = false;
  }

  // ── Discard toast routing (issue #277) ─────────────────────
  // The layout doesn't know what just happened on /meal — that context is
  // carried in the buffer's `kind` discriminator. Map each kind to the
  // matching Czech-grammar-correct string; the back-out paths and the
  // delete path each set their own kind, so we never have to reverse-engineer
  // here.
  const discardMessage = $derived(() => {
    const buf = $discardBuffer;
    if (!buf) return '';
    switch (buf.kind) {
      case 'compose': return commonStrings.meal.discardedComposeToast;
      case 'edit':    return commonStrings.meal.discardedEditToast;
      case 'delete':  return commonStrings.meal.deletedToast;
    }
  });

  $effect(() => {
    if (ctx.status === 'loading') return;
    if (ctx.status === 'empty' && !isOnboarding) goto('/');
  });

  // The shell scrolls inside <main>, not on window — so SvelteKit's default
  // scroll-to-top has no effect here. Reset our own scroll region whenever
  // the route changes (issue #325).
  let mainEl: HTMLElement | undefined = $state();
  $effect(() => {
    void currentPath;
    if (mainEl) {
      mainEl.scrollTop = 0;
      mainEl.scrollLeft = 0;
    }
  });
</script>

<div class="h-dvh flex flex-col bg-surface">
  <main bind:this={mainEl} class="flex-1 min-h-0 overflow-y-auto">
    {@render children()}
  </main>

  {#if showNav}
    <nav class="relative z-30 bg-white border-t border-surface-dark pt-2 pb-5 shrink-0">
      <div class="grid grid-cols-3 items-end max-w-lg mx-auto">
        <a
          href="/day/{todayIso()}"
          class="flex flex-col items-center gap-0.5 {dnesActive ? 'text-primary' : 'text-text-muted'}"
          onclick={() => {
            // When already on /day/today the route does not change, so the
            // strip's selection effect does not re-run — pulse the recentre
            // signal so the strip jumps back to today regardless of where
            // the user scrolled it. Always pulsing is safe: on a real route
            // change the page-level effect already recentres before this
            // signal lands.
            pulseRecentreDayStrip();
          }}
        >
          <TodayIcon class="w-[22px] h-[22px]" />
          <span class="text-[10px] {dnesActive ? 'font-semibold' : ''}">{commonStrings.nav.today}</span>
        </a>
        <div class="flex justify-center">
          {#if showFab}
            <button
              class="relative z-50 -mt-7 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center text-3xl font-light ring-4 ring-primary/20"
              aria-label={commonStrings.nav.addRecordAria}
              onclick={() => (fabOpen = true)}
            >+</button>
          {/if}
        </div>
        <a
          href="/week"
          class="flex flex-col items-center gap-0.5 {!dnesActive ? 'text-primary' : 'text-text-muted'}"
        >
          <CalendarIcon class="w-[22px] h-[22px]" />
          <span class="text-[10px] {!dnesActive ? 'font-semibold' : ''}">{commonStrings.nav.week}</span>
        </a>
      </div>
    </nav>
  {/if}
</div>

{#if $discardBuffer}
  <Toast
    message={discardMessage()}
    type="info"
    onUndo={handleDiscardUndo}
    onClose={handleDiscardClose}
  />
{/if}

{#if fabOpen}
  <FabActionSheet
    date={selectedDate}
    {loggedTypes}
    onclose={() => (fabOpen = false)}
    oncapturephoto={handleFabPhotoCapture}
  />
{/if}
