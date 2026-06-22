<script lang="ts">
  import { goto } from '$app/navigation';
  import FoodIcon from '$lib/components/icons/FoodIcon.svelte';
  import CameraIcon from '$lib/components/icons/CameraIcon.svelte';
  import PersonIcon from '$lib/components/icons/PersonIcon.svelte';
  import { commonStrings } from '$lib/strings/common';
  import { mealConfig } from '$lib/config/meals';
  import type { MealType } from '$lib/domain/models';

  type Props = {
    date: string;
    onclose: () => void;
    oncapturephoto?: (blob: Blob) => void;
    /** Meal types already logged for `date`; renders a ✓ in the submenu. */
    loggedTypes?: MealType[];
    /**
     * Show the contextual fourth "evaluate test" row, gated by the caller on
     * `isPhaseEndForEvaluation(schedule, date)` (issue #331). Defaults to
     * `false` so ordinary days keep the three-action sheet.
     */
    showEvaluate?: boolean;
    /**
     * Id of the phase ending on `date`. Carried into `/evaluation` so the
     * screen can resolve which phase to evaluate (issue #331). Required for
     * the evaluate row to navigate to a usable screen.
     */
    evaluatePhaseId?: string;
  };

  let {
    date,
    onclose,
    oncapturephoto,
    loggedTypes = [],
    showEvaluate = false,
    evaluatePhaseId = '',
  }: Props = $props();

  let photoInput: HTMLInputElement | undefined = $state();
  /** When true, the bottom-sheet shows the four meal-type rows instead of the
   *  top-level action list. (Meal-Type FAB Submenu, ADR-0018.) */
  let mealSubmenuOpen = $state(false);

  const mealTypes: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

  function navigateToMeal(type: MealType) {
    goto(`/meal?type=${type}&date=${date}&returnTo=/day/${date}`);
    onclose();
  }

  function navigate(path: string) {
    goto(`${path}?date=${date}&returnTo=/day/${date}`);
    onclose();
  }

  function navigateToEvaluation() {
    goto(`/evaluation?phase=${encodeURIComponent(evaluatePhaseId)}&date=${date}&returnTo=/day/${date}`);
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
  class="fixed inset-0 bg-black/35 z-[60]"
  onclick={onclose}
></div>

<!-- Bottom sheet -->
<div
  role="dialog"
  aria-label={mealSubmenuOpen ? commonStrings.fabSheet.pickMealType : commonStrings.fabSheet.heading}
  class="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-[20px] pb-safe"
>
  {#if mealSubmenuOpen}
    <div class="px-5 pt-4 pb-2 text-center">
      <p class="text-[11px] text-text-muted uppercase tracking-wide">
        {commonStrings.fabSheet.pickMealType}
      </p>
    </div>
    <div class="mx-5 border-t border-surface-dark"></div>

    {#each mealTypes as type (type)}
      {@const cfg = mealConfig[type]}
      {@const Icon = cfg.icon}
      {@const logged = loggedTypes.includes(type)}
      <button
        data-testid="fab-meal-type-{type}"
        data-logged={logged ? 'true' : 'false'}
        aria-label={logged
          ? `${cfg.label}, ${commonStrings.fabSheet.alreadyLogged}`
          : cfg.label}
        class="w-full flex items-center gap-3 px-5 py-4 border-b border-surface-dark active:bg-surface"
        onclick={() => navigateToMeal(type)}
      >
        <span class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
          <Icon class="w-[22px] h-[22px]" />
        </span>
        <span class="flex-1 text-[15px] font-semibold text-text text-left">
          {cfg.label}
        </span>
        {#if logged}
          <span aria-hidden="true" class="text-success text-base">✓</span>
        {/if}
        <span class="text-text-muted text-sm">›</span>
      </button>
    {/each}

    <button
      data-testid="fab-meal-type-back"
      class="w-full py-4 text-center text-[13px] text-text-muted active:bg-surface"
      onclick={() => (mealSubmenuOpen = false)}
    >
      {commonStrings.fabSheet.cancel}
    </button>
  {:else}
    <div class="px-5 pt-4 pb-2 text-center">
      <p class="text-[11px] text-text-muted uppercase tracking-wide">
        {commonStrings.fabSheet.heading}
      </p>
    </div>
    <div class="mx-5 border-t border-surface-dark"></div>

    <button
      data-testid="fab-action-meal"
      class="w-full flex items-center gap-3 px-5 py-4 border-b border-surface-dark active:bg-surface"
      onclick={() => (mealSubmenuOpen = true)}
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

    {#if showEvaluate}
      <button
        data-testid="fab-action-evaluate"
        class="w-full flex items-center gap-3 px-5 py-4 border-b border-surface-dark active:bg-surface"
        onclick={navigateToEvaluation}
      >
        <span class="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-primary">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </span>
        <span class="flex-1 text-[15px] font-semibold text-primary text-left">
          {commonStrings.fabSheet.addEvaluation}
        </span>
        <span class="text-primary text-sm">›</span>
      </button>
    {/if}

    <button
      data-testid="fab-action-close"
      class="w-full py-4 text-center text-[13px] text-text-muted active:bg-surface"
      onclick={onclose}
    >
      {commonStrings.fabSheet.cancel}
    </button>
  {/if}

  <div class="h-5"></div>
</div>
