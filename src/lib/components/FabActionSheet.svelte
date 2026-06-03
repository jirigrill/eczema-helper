<script lang="ts">
  import { goto } from '$app/navigation';
  import FoodIcon from '$lib/components/icons/FoodIcon.svelte';
  import CameraIcon from '$lib/components/icons/CameraIcon.svelte';
  import PersonIcon from '$lib/components/icons/PersonIcon.svelte';
  import { commonStrings } from '$lib/strings/common';

  type Props = {
    date: string;
    onclose: () => void;
    oncapturephoto?: (blob: Blob) => void;
  };

  let { date, onclose, oncapturephoto }: Props = $props();

  let photoInput: HTMLInputElement | undefined = $state();

  function navigate(path: string) {
    goto(`${path}?date=${date}&returnTo=/day/${date}`);
    onclose();
  }

  function handleFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    oncapturephoto?.(file);
    onclose();
    (e.target as HTMLInputElement).value = '';
  }
</script>

<!-- Backdrop -->
<div
  role="presentation"
  class="fixed inset-0 bg-black/35 z-40"
  onclick={onclose}
></div>

<!-- Bottom sheet -->
<div
  role="dialog"
  aria-label={commonStrings.fabSheet.heading}
  class="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[20px] pb-safe"
>
  <div class="px-5 pt-4 pb-2 text-center">
    <p class="text-[11px] text-text-muted uppercase tracking-wide">
      {commonStrings.fabSheet.heading}
    </p>
  </div>
  <div class="mx-5 border-t border-surface-dark"></div>

  <button
    data-testid="fab-action-meal"
    class="w-full flex items-center gap-3 px-5 py-4 border-b border-surface-dark active:bg-surface"
    onclick={() => navigate('/meal')}
  >
    <span class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
      <FoodIcon class="w-[22px] h-[22px]" />
    </span>
    <span class="flex-1 text-[15px] font-semibold text-text text-left">
      {commonStrings.fabSheet.addMeal}
    </span>
    <span class="text-text-muted text-sm">›</span>
  </button>

  <input
    bind:this={photoInput}
    type="file"
    accept="image/*"
    capture="environment"
    class="sr-only"
    onchange={handleFileChange}
  />
  <button
    data-testid="fab-action-photo"
    class="w-full flex items-center gap-3 px-5 py-4 border-b border-surface-dark active:bg-surface"
    onclick={() => photoInput?.click()}
  >
    <span class="w-10 h-10 rounded-full bg-text-muted/8 flex items-center justify-center shrink-0 text-text-muted">
      <CameraIcon class="w-[22px] h-[22px]" />
    </span>
    <span class="flex-1 text-[15px] text-text-muted text-left">
      {commonStrings.fabSheet.addPhoto}
    </span>
    <span class="text-text-muted text-sm">›</span>
  </button>

  <button
    data-testid="fab-action-skin"
    class="w-full flex items-center gap-3 px-5 py-4 border-b border-surface-dark active:bg-surface"
    onclick={() => navigate('/skin')}
  >
    <span class="w-10 h-10 rounded-full bg-text-muted/8 flex items-center justify-center shrink-0 text-text-muted">
      <PersonIcon class="w-[22px] h-[22px]" />
    </span>
    <span class="flex-1 text-[15px] text-text-muted text-left">
      {commonStrings.fabSheet.addSkin}
    </span>
    <span class="text-text-muted text-sm">›</span>
  </button>

  <button
    data-testid="fab-action-close"
    class="w-full py-4 text-center text-[13px] text-text-muted active:bg-surface"
    onclick={onclose}
  >
    {commonStrings.fabSheet.cancel}
  </button>

  <div class="h-5"></div>
</div>
