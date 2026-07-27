<script lang="ts">
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import FoodIcon from '$lib/components/icons/FoodIcon.svelte';
  import PersonIcon from '$lib/components/icons/PersonIcon.svelte';
  import { commonStrings } from '$lib/strings/common';
  import { mealConfig } from '$lib/config/meals';
  import type { MealType } from '$lib/domain/models';

  type Props = {
    date: string;
    onclose: () => void;
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
    /**
     * When supplied, tapping a meal-type row invokes this callback with the
     * chosen `MealType` instead of navigating to `/meal` (copy-destination
     * picker, spec #599). Absent → today's FAB add-meal navigation.
     */
    onSelectMealType?: (type: MealType) => void;
    /**
     * Open directly on the meal-type submenu instead of the top-level action
     * list (copy-destination picker, spec #599). The picker's only job here is
     * to pick a slot, so the "add meal / skin" chooser is skipped.
     */
    initialMealSubmenu?: boolean;
    /**
     * The meal type to mark as the copy source (spec #599) — rendered with a
     * subtle "current slot" affordance so the mother sees which slot the copy
     * defaults to. Purely presentational; every row still copies on tap.
     */
    preselectedType?: MealType;
  };

  let {
    date,
    onclose,
    loggedTypes = [],
    showEvaluate = false,
    evaluatePhaseId = '',
    onSelectMealType,
    initialMealSubmenu = false,
    preselectedType,
  }: Props = $props();

  /** When true, the bottom-sheet shows the four meal-type rows instead of the
   *  top-level action list. (Meal-Type FAB Submenu, ADR-0018.) Seeded from the
   *  `initialMealSubmenu` prop's initial value only — untracked because the
   *  prop is an open-on-mount seed, not a reactive source after mount. */
  let mealSubmenuOpen = $state(untrack(() => initialMealSubmenu));

  const mealTypes: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

  function selectMealType(type: MealType) {
    if (onSelectMealType) {
      // Leave the sheet open — the caller (copy-destination picker) owns dismissal.
      onSelectMealType(type);
      return;
    }
    goto(`/meal?type=${type}&date=${date}&returnTo=/day/${date}`);
    onclose();
  }

  function navigate(path: string) {
    goto(`${path}?date=${date}&returnTo=/day/${date}`);
    onclose();
  }

  function navigateToEvaluation() {
    goto(
      `/evaluation?phase=${encodeURIComponent(evaluatePhaseId)}&date=${date}&returnTo=/day/${date}`,
    );
    onclose();
  }
</script>

<!-- Backdrop -->
<div role="presentation" class="fixed inset-0 z-[60] bg-black/35" onclick={onclose}></div>

<!-- Bottom sheet -->
<div
  role="dialog"
  aria-label={mealSubmenuOpen
    ? commonStrings.fabSheet.pickMealType
    : commonStrings.fabSheet.heading}
  class="pb-safe fixed right-0 bottom-0 left-0 z-[70] rounded-t-[20px] bg-white"
>
  {#if mealSubmenuOpen}
    <div class="px-5 pt-4 pb-2 text-center">
      <p class="text-text-muted text-[11px] tracking-wide uppercase">
        {commonStrings.fabSheet.pickMealType}
      </p>
    </div>
    <div class="border-surface-dark mx-5 border-t"></div>

    {#each mealTypes as type (type)}
      {@const cfg = mealConfig[type]}
      {@const Icon = cfg.icon}
      {@const logged = loggedTypes.includes(type)}
      {@const preselected = preselectedType === type}
      <button
        data-testid="fab-meal-type-{type}"
        data-logged={logged ? 'true' : 'false'}
        data-preselected={preselected ? 'true' : undefined}
        aria-label={logged ? `${cfg.label}, ${commonStrings.fabSheet.alreadyLogged}` : cfg.label}
        class="border-surface-dark active:bg-surface flex w-full items-center gap-3 border-b px-5 py-4 {preselected
          ? 'bg-primary/5'
          : ''}"
        onclick={() => selectMealType(type)}
      >
        <span
          class="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        >
          <Icon class="h-[22px] w-[22px]" />
        </span>
        <span class="text-text flex-1 text-left text-[15px] font-semibold">
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
      class="text-text-muted active:bg-surface w-full py-4 text-center text-[13px]"
      onclick={() => (initialMealSubmenu ? onclose() : (mealSubmenuOpen = false))}
    >
      {commonStrings.fabSheet.cancel}
    </button>
  {:else}
    <div class="px-5 pt-4 pb-2 text-center">
      <p class="text-text-muted text-[11px] tracking-wide uppercase">
        {commonStrings.fabSheet.heading}
      </p>
    </div>
    <div class="border-surface-dark mx-5 border-t"></div>

    <button
      data-testid="fab-action-meal"
      class="border-surface-dark active:bg-surface flex w-full items-center gap-3 border-b px-5 py-4"
      onclick={() => (mealSubmenuOpen = true)}
    >
      <span
        class="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
      >
        <FoodIcon class="h-[22px] w-[22px]" />
      </span>
      <span class="text-text-muted flex-1 text-left text-[15px]">
        {commonStrings.fabSheet.addMeal}
      </span>
      <span class="text-text-muted text-sm">›</span>
    </button>

    <button
      data-testid="fab-action-skin"
      class="border-surface-dark active:bg-surface flex w-full items-center gap-3 border-b px-5 py-4"
      onclick={() => navigate('/skin')}
    >
      <span
        class="bg-text-muted/8 text-text-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
      >
        <PersonIcon class="h-[22px] w-[22px]" />
      </span>
      <span class="text-text-muted flex-1 text-left text-[15px]">
        {commonStrings.fabSheet.addSkin}
      </span>
      <span class="text-text-muted text-sm">›</span>
    </button>

    {#if showEvaluate}
      <button
        data-testid="fab-action-evaluate"
        class="border-surface-dark active:bg-surface flex w-full items-center gap-3 border-b px-5 py-4"
        onclick={navigateToEvaluation}
      >
        <span
          class="bg-primary/15 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </span>
        <span class="text-text-muted flex-1 text-left text-[15px]">
          {commonStrings.fabSheet.addEvaluation}
        </span>
        <span class="text-text-muted text-sm">›</span>
      </button>
    {/if}

    <button
      data-testid="fab-action-close"
      class="text-text-muted active:bg-surface w-full py-4 text-center text-[13px]"
      onclick={onclose}
    >
      {commonStrings.fabSheet.cancel}
    </button>
  {/if}

  <div class="h-5"></div>
</div>
