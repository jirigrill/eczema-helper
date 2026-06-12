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
  import type { SkinPhoto } from '$lib/domain/models';
  import { discardBuffer, clearBuffer } from '$lib/stores/discard-buffer';

  let { children } = $props();

  const ctx = $derived($scheduleContext);
  const currentPath = $derived($page.url.pathname);
  const isOnboarding = $derived(currentPath === '/');
  const isDetailScreen = $derived(
    currentPath.startsWith('/meal') || currentPath.startsWith('/settings') || currentPath.startsWith('/skin')
  );
  const showNav = $derived(!isOnboarding && ctx.status === 'ready' && !isDetailScreen);
  const dnesActive = $derived($page.params.date === todayIso());

  const selectedDate = $derived($page.params.date ?? todayIso());

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
    goto(`/meal?returnTo=${encodeURIComponent(buf.returnTo)}&type=${buf.mealType}`);
  }

  let discardUndoFired = $state(false);

  function handleDiscardClose(): void {
    if (!discardUndoFired) {
      clearBuffer();
    }
    discardUndoFired = false;
  }

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
          href="/day/{todayIso()}"
          class="flex flex-col items-center gap-0.5 {dnesActive ? 'text-primary' : 'text-text-muted'}"
        >
          <TodayIcon class="w-[22px] h-[22px]" />
          <span class="text-[10px] {dnesActive ? 'font-semibold' : ''}">{commonStrings.nav.today}</span>
        </a>
        <div class="flex justify-center">
          <button
            class="-mt-7 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center text-3xl font-light ring-4 ring-primary/20"
            aria-label={commonStrings.nav.addRecordAria}
            onclick={() => (fabOpen = true)}
          >+</button>
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
    message={commonStrings.meal.discardedToast}
    type="info"
    onUndo={handleDiscardUndo}
    onClose={handleDiscardClose}
  />
{/if}

{#if fabOpen}
  <FabActionSheet date={selectedDate} onclose={() => (fabOpen = false)} oncapturephoto={handleFabPhotoCapture} />
{/if}
