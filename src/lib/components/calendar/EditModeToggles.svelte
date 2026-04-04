<script lang="ts">
  import type { FoodCategory } from '$lib/domain/models';
  import { draftEliminationStore } from '$lib/stores/draft-elimination.svelte';
  import { cs } from '$lib/i18n/cs';

  let {
    actionMode,
    visibleCategories,
    rangeStart,
    rangeEnd,
    accentText,
    toggleOnBg,
    toggleOnPartial,
    toggleRowActive,
    toggleRowPartial,
    onSetActionMode,
  }: {
    actionMode: 'eliminate' | 'reintroduce';
    visibleCategories: FoodCategory[];
    rangeStart: string | null;
    rangeEnd: string | null;
    accentText: string;
    toggleOnBg: string;
    toggleOnPartial: string;
    toggleRowActive: string;
    toggleRowPartial: string;
    onSetActionMode: (mode: 'eliminate' | 'reintroduce') => void;
  } = $props();

  const expandedCategoryId = $derived(draftEliminationStore.expandedCategoryId);

  function isToggleOn(cat: FoodCategory): boolean {
    return actionMode === 'eliminate'
      ? draftEliminationStore.catFullElim(cat)
      : draftEliminationStore.catFullReintro(cat);
  }

  function isTogglePartial(cat: FoodCategory): boolean {
    if (actionMode === 'eliminate') {
      return !draftEliminationStore.catFullElim(cat) && draftEliminationStore.catPartialElim(cat);
    }
    return !draftEliminationStore.catFullReintro(cat) && draftEliminationStore.catPartialReintro(cat);
  }

  function isSubToggleOn(catId: string, siId: string): boolean {
    return actionMode === 'eliminate'
      ? draftEliminationStore.isElim(catId, siId)
      : draftEliminationStore.isReintro(catId, siId);
  }

  function handleGroupToggle(cat: FoodCategory) {
    if (actionMode === 'eliminate') {
      draftEliminationStore.toggleGroupElim(cat);
    } else {
      draftEliminationStore.toggleGroupReintro(cat);
    }
  }

  function handleSubToggle(catId: string, siId: string) {
    if (actionMode === 'eliminate') {
      draftEliminationStore.toggleElim(catId, siId);
    } else {
      draftEliminationStore.toggleReintro(catId, siId);
    }
  }
</script>

{#if !rangeStart}
  <div class="mx-4 mt-3 text-xs text-text-muted text-center">{cs.selectStart}</div>
{:else if !rangeEnd}
  <div class="mx-4 mt-3 text-xs {accentText} text-center font-medium">{cs.selectEnd}</div>
{/if}

<!-- Action mode toggle -->
<div class="flex gap-1 mx-3 mt-3 p-0.5 bg-surface-dark rounded-lg">
  <button
    type="button"
    aria-pressed={actionMode === 'eliminate'}
    class="flex-1 py-1.5 rounded-md text-xs font-medium transition-colors {actionMode === 'eliminate' ? 'bg-primary text-white shadow-sm' : 'text-text-muted'}"
    onclick={() => onSetActionMode('eliminate')}
  >{cs.eliminate}</button>
  <button
    type="button"
    aria-pressed={actionMode === 'reintroduce'}
    class="flex-1 py-1.5 rounded-md text-xs font-medium transition-colors {actionMode === 'reintroduce' ? 'bg-reintro-accent text-white shadow-sm' : 'text-text-muted'}"
    onclick={() => onSetActionMode('reintroduce')}
  >{cs.reintroduce}</button>
</div>

<!-- Category toggle list -->
{#if actionMode === 'reintroduce' && visibleCategories.length === 0}
  <div class="mx-4 mt-4 text-sm text-text-muted text-center">{cs.nothingToReintroduce}</div>
{/if}
<div class="mt-2 mx-3 space-y-1">
  {#each visibleCategories as cat (cat.id)}
    {@const on = isToggleOn(cat)}
    {@const partial = isTogglePartial(cat)}
    {@const isExpanded = expandedCategoryId === cat.id}

    <div class="rounded-xl border overflow-hidden transition-colors
      {on ? toggleRowActive : partial ? toggleRowPartial : 'border-surface-dark bg-white'}">
      <div class="flex items-center gap-2 px-3 py-2">
        {#if cat.subItems.length > 0}
          <button
            type="button"
            class="flex items-center gap-2 flex-1 min-w-0"
            onclick={() => draftEliminationStore.toggleExpand(cat.id)}
          >
            <span class="text-lg flex-none">{cat.icon}</span>
            <span class="text-sm font-medium text-text truncate">{cat.nameCs}</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-text-muted flex-none transition-transform {isExpanded ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        {:else}
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <span class="text-lg flex-none">{cat.icon}</span>
            <span class="text-sm font-medium text-text truncate">{cat.nameCs}</span>
          </div>
        {/if}
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="{cat.nameCs} — {actionMode === 'eliminate' ? cs.eliminate : cs.reintroduce}"
          class="flex-none h-7 w-12 rounded-full border-2 transition-colors flex items-center px-0.5
            {on ? `${toggleOnBg} justify-end` : partial ? `${toggleOnPartial} justify-end` : 'bg-surface-dark border-surface-dark justify-start'}"
          onclick={() => handleGroupToggle(cat)}
        >
          <span class="block h-5 w-5 rounded-full bg-white shadow-sm"></span>
        </button>
      </div>

      {#if isExpanded && cat.subItems.length > 0}
        <div class="border-t border-surface-dark bg-surface/50">
          {#each cat.subItems as si (si.id)}
            {#if actionMode === 'eliminate' || draftEliminationStore.snapshotSubRelevantForReintro(cat.id, si.id)}
              {@const siOn = isSubToggleOn(cat.id, si.id)}
              <div class="flex items-center gap-2 px-3 py-1.5 pl-10">
                <span class="text-sm text-text flex-1 truncate">{si.nameCs}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={siOn}
                  aria-label="{si.nameCs} — {actionMode === 'eliminate' ? cs.eliminate : cs.reintroduce}"
                  class="flex-none h-6 w-10 rounded-full border-2 transition-colors flex items-center px-0.5
                    {siOn ? `${toggleOnBg} justify-end` : 'bg-surface-dark border-surface-dark justify-start'}"
                  onclick={() => handleSubToggle(cat.id, si.id)}
                >
                  <span class="block h-4 w-4 rounded-full bg-white shadow-sm"></span>
                </button>
              </div>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</div>
<div class="h-4"></div>
