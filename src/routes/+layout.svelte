<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { useRegisterSW } from 'virtual:pwa-register/svelte';

  useRegisterSW({ immediate: true });
  import { goto } from '$app/navigation';
  import { settingsStore } from '$lib/stores/settings.svelte';
  import FabActionSheet from '$lib/components/FabActionSheet.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import { commonStrings } from '$lib/strings/common';
  import { todayIso } from '$lib/utils/date';
  import { createMealSession } from '$lib/stores/meal-session';
  import type { MealType } from '$lib/domain/models';
  import { discardBuffer, clearBuffer } from '$lib/stores/discard-buffer';
  import type { DiscardedMealCopy } from '$lib/stores/discard-buffer';
  import { mealSession } from '$lib/stores/meal-session';

  let { children } = $props();

  const seeded = $derived(settingsStore.status);
  const currentPath = $derived($page.url.pathname);
  const isOnboarding = $derived(currentPath === '/');
  const isDetailScreen = $derived(
    currentPath.startsWith('/meal') ||
      currentPath.startsWith('/settings') ||
      currentPath.startsWith('/skin'),
  );
  const today = $derived(todayIso());
  // The floating FAB is the sole global add affordance (PRD #623, §3). It rides
  // the seeded signal — once the mother has a feeding stage she is set up — and
  // is hidden only on first run and the detail screens (which own their own
  // save actions). No day is suppressed: every day in range is loggable.
  const showFab = $derived(!isOnboarding && seeded === 'seeded' && !isDetailScreen);

  const selectedDate = $derived($page.params.date ?? today);

  // Day-scoped meal session — feeds the Meal-Type FAB Submenu so it can
  // mark already-logged slots with a ✓ for the current `selectedDate`.
  const dayMealSession = $derived(createMealSession(selectedDate));
  const loggedTypes = $derived<MealType[]>($dayMealSession.map((m) => m.mealType));

  let fabOpen = $state(false);

  function handleDiscardUndo(): void {
    const buf = $discardBuffer;
    if (!buf) return;
    // Don't clearBuffer here — the target page reads + clears it on mount.
    // Only navigate; onClose will be called by Toast after this, but we guard it.
    discardUndoFired = true;
    if (buf.kind === 'skin-edit' || buf.kind === 'skin-delete') {
      goto(
        `/skin?date=${buf.date}&id=${buf.observationId}&returnTo=${encodeURIComponent(buf.returnTo)}`,
      );
      return;
    }
    // A copy's undo is a *reversal* of the write it made against the
    // destination slot, not a `/meal` rehydrate: delete the created meal, or
    // remove only the added items and restore the prior `updatedAt`. Then land
    // on the destination day so the reverted slot is visible (issue #606).
    if (buf.kind === 'meal-copy') {
      void reverseCopy(buf).then(() => {
        clearBuffer();
        goto(buf.returnTo);
      });
      return;
    }
    goto(
      `/meal?type=${buf.mealType}&date=${buf.date}&actor=${buf.actor}&returnTo=${encodeURIComponent(buf.returnTo)}`,
    );
  }

  /**
   * Reverse a copy-meal write (issue #606). The buffer captured everything the
   * reversal needs, so no re-derivation is required:
   *  - `destinationPreexisted === false` → the copy created the slot; remove it.
   *  - `destinationPreexisted === true` → the copy merged; drop only the
   *    `addedItemIds` and restore `priorUpdatedAt` (unset it when it was
   *    previously unset). The destination's prior foods + note stay untouched.
   */
  async function reverseCopy(buf: DiscardedMealCopy): Promise<void> {
    const { date, mealType, actor } = buf.destinationSlot;
    if (!buf.destinationPreexisted) {
      await mealSession.remove(date, mealType, actor);
      return;
    }
    const loaded = await mealSession.loadBySlot(date, mealType, actor);
    if (!loaded.ok || !loaded.data) return;
    const added = new Set(buf.addedItemIds);
    const restored = {
      ...loaded.data,
      items: loaded.data.items.filter((i) => !added.has(i.id)),
      updatedAt: buf.priorUpdatedAt,
    };
    await mealSession.save(restored);
  }

  let discardUndoFired = $state(false);

  function handleDiscardClose(): void {
    if (!discardUndoFired) {
      clearBuffer();
    }
    discardUndoFired = false;
  }

  // ── Discard toast routing (issue #277, extended for /skin per ADR-0021) ─
  // The layout doesn't know what just happened on the source page — that
  // context is carried in the buffer's `kind` discriminator. Map each kind
  // to the matching Czech-grammar-correct string; the back-out paths and the
  // delete path each set their own kind, so we never reverse-engineer here.
  const discardMessage = $derived(() => {
    const buf = $discardBuffer;
    if (!buf) return '';
    switch (buf.kind) {
      case 'meal-compose':
        return commonStrings.meal.discardedComposeToast;
      case 'meal-edit':
        return commonStrings.meal.discardedEditToast;
      case 'meal-delete':
        return commonStrings.meal.deletedToast;
      case 'meal-copy':
        return commonStrings.meal.copiedToast;
      case 'skin-edit':
        return commonStrings.skin.discardedEditToast;
      case 'skin-delete':
        return commonStrings.skin.deletedToast;
    }
  });

  // The seeded signal is `settings.feedingStage != null` (PRD #623, §3): an
  // unset stage routes to first run, a set stage routes to the day view. Hold
  // while `loading` so a seeded user hard-loading the day view is never bounced
  // to first run on the pre-emission tick (the #353 redirect race).
  $effect(() => {
    if (seeded === 'loading') return;
    if (seeded === 'unset' && !isOnboarding) goto('/');
    if (seeded === 'seeded' && isOnboarding) goto(`/day/${today}`);
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

<div class="bg-surface flex h-dvh flex-col">
  <main bind:this={mainEl} class="min-h-0 flex-1 overflow-y-auto">
    {@render children()}
  </main>
</div>

{#if showFab}
  <button
    class="bg-primary ring-primary/20 fixed right-5 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full text-3xl font-light text-white shadow-lg ring-4"
    aria-label={commonStrings.nav.addRecordAria}
    onclick={() => (fabOpen = true)}>+</button
  >
{/if}

{#if $discardBuffer}
  <Toast
    message={discardMessage()}
    type="info"
    onUndo={handleDiscardUndo}
    onClose={handleDiscardClose}
  />
{/if}

{#if fabOpen}
  <FabActionSheet date={selectedDate} {loggedTypes} onclose={() => (fabOpen = false)} />
{/if}
