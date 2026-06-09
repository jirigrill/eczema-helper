<script lang="ts">
  import { CATEGORIES } from '$lib/data/categories';
  import { getCategoryConfig } from '$lib/config/categories';
  import { subitemStrings } from '$lib/strings/categories';
  import { actionStrings } from '$lib/strings/actions';
  import { commonStrings } from '$lib/strings/common';
  import Button from '$lib/components/Button.svelte';
  import { matchAllergen } from '$lib/domain/allergen-matcher';

  let {
    selected = $bindable<string[]>([]),
    disabledSlugs = [],
    variant = 'primary',
    expandable = false,
  }: {
    selected?: string[];
    disabledSlugs?: string[];
    variant?: 'primary' | 'danger';
    expandable?: boolean;
  } = $props();

  const regularCategories = CATEGORIES;

  let customInput = $state('');
  let expandedCategory = $state<string | null>(null);

  const customItems = $derived(selected.filter(s => s.startsWith('other:')));

  // Whole: explicit whole-allergenId OR every sub-item individually ticked
  function isWholeSelected(allergenId: string): boolean {
    if (selected.includes(allergenId)) return true;
    const cat = CATEGORIES.find(c => c.allergenId === allergenId);
    if (!cat || cat.subItems.length === 0) return false;
    return cat.subItems.every(sub => selected.includes(sub.subitemId));
  }

  // Partial: some (but not all) sub-items selected, whole allergenId not selected
  function isPartiallySelected(allergenId: string): boolean {
    if (isWholeSelected(allergenId)) return false;
    return selected.some(s => s.startsWith(allergenId + ':'));
  }

  function isCategorySelected(allergenId: string) {
    return isWholeSelected(allergenId) || isPartiallySelected(allergenId);
  }

  function toggle(allergenId: string) {
    if (disabledSlugs.includes(allergenId)) return;
    if (!expandable) {
      if (selected.includes(allergenId)) {
        selected = selected.filter(s => s !== allergenId);
      } else {
        selected = [...selected, allergenId];
      }
      return;
    }
    const cat = CATEGORIES.find(c => c.allergenId === allergenId);
    if (cat && cat.subItems.length > 0) {
      expandedCategory = expandedCategory === allergenId ? null : allergenId;
    } else {
      if (selected.includes(allergenId)) {
        selected = selected.filter(s => s !== allergenId);
      } else {
        selected = [...selected, allergenId];
      }
    }
  }

  function toggleAllForCategory(allergenId: string) {
    const withoutSubs = selected.filter(s => !s.startsWith(allergenId + ':'));
    if (withoutSubs.includes(allergenId)) {
      selected = withoutSubs.filter(s => s !== allergenId);
    } else {
      selected = [...withoutSubs, allergenId];
    }
  }

  function toggleSubItem(allergenId: string, subitemId: string) {
    const withoutWhole = selected.filter(s => s !== allergenId);
    if (withoutWhole.includes(subitemId)) {
      selected = withoutWhole.filter(s => s !== subitemId);
    } else {
      selected = [...withoutWhole, subitemId];
    }
  }

  // Deterministic icon for custom allergens — stable across re-renders
  const CUSTOM_ICONS = ['🌿', '🫚', '🧄', '🧅', '🫛', '🌾', '🍄', '🫙', '🧂', '🌶️', '🫑', '🥬', '🫘', '🥜', '🍯'];
  function customIcon(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % CUSTOM_ICONS.length;
    return CUSTOM_ICONS[hash];
  }

  function customName(slug: string): string {
    return slug.slice(6); // strip "other:"
  }

  function addCustom() {
    const names = customInput
      .split(/[,\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    if (names.length === 0) return;
    const newSlugs = names
      .map(n => matchAllergen(n)?.id ?? `other:${n}`)
      .filter(slug => !selected.includes(slug));
    if (newSlugs.length > 0) selected = [...selected, ...newSlugs];
    customInput = '';
  }

  function selectedSubItemCount(allergenId: string): number {
    if (selected.includes(allergenId)) {
      const cat = CATEGORIES.find(c => c.allergenId === allergenId);
      return cat?.subItems.length ?? 1;
    }
    return selected.filter(s => s.startsWith(allergenId + ':')).length;
  }

  function removeCustom(slug: string) {
    selected = selected.filter(s => s !== slug);
  }

  function isSelected(id: string) {
    return selected.includes(id);
  }

  function isDisabled(allergenId: string) {
    return disabledSlugs.includes(allergenId);
  }

</script>

<div class="space-y-2">
  <div class="grid grid-cols-3 gap-2">
    {#each regularCategories as cat (cat.allergenId)}
      {@const whole = isWholeSelected(cat.allergenId)}
      {@const partial = isPartiallySelected(cat.allergenId)}
      {@const dis = isDisabled(cat.allergenId)}
      {@const isExpanded = expandable && expandedCategory === cat.allergenId}
      {@const cfg = getCategoryConfig(cat.allergenId)}
      <button
        type="button"
        data-state={dis
          ? undefined
          : isExpanded || (partial && variant === 'primary')
            ? 'info'
            : partial && variant === 'danger'
              ? 'danger'
              : undefined}
        class="
          flex flex-col items-center gap-1 py-3 px-1 rounded-xl text-xs font-medium
          transition-all min-h-[72px] border
          {dis
            ? 'bg-surface border-surface-dark text-text-muted opacity-50 cursor-not-allowed'
            : isExpanded
              ? ''
              : whole && variant === 'primary'
                ? 'bg-primary border-primary text-white shadow-sm'
                : whole && variant === 'danger'
                  ? 'bg-danger border-danger text-white shadow-sm'
                  : partial && variant === 'primary'
                    ? ''
                    : partial && variant === 'danger'
                      ? ''
                      : 'bg-white border-surface-dark text-text hover:border-primary/40'}
        "
        onclick={() => toggle(cat.allergenId)}
        disabled={dis}
      >
        <span class="text-2xl leading-none">{cfg.icon}</span>
        <span class="leading-tight text-center">{cfg.name}</span>
        {#if dis}
          <span class="text-[10px] opacity-70">{commonStrings.categoryGrid.yourAllergyLabel}</span>
        {:else if partial}
          <span class="text-[10px] font-semibold opacity-80">{commonStrings.categoryGrid.partialLabel}</span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Sub-item expansion panel (expandable mode only) -->
  {#if expandable && expandedCategory}
    {@const cat = regularCategories.find(c => c.allergenId === expandedCategory)}
    {#if cat && cat.subItems.length > 0}
      {@const cfg = getCategoryConfig(cat.allergenId)}
      <div class="rounded-xl border border-primary/30 bg-white p-3 space-y-2">
        <div class="flex items-center justify-between">
          <p class="body-medium">{cfg.icon} {cfg.name}</p>
          <Button variant="ghost-sm" onclick={() => (expandedCategory = null)}>
            {selectedSubItemCount(cat.allergenId) > 0 ? `${actionStrings.done} (${selectedSubItemCount(cat.allergenId)})` : actionStrings.done}
          </Button>
        </div>
        <!-- "Vše" chip -->
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="py-1.5 px-3 rounded-xl text-sm font-medium transition-all border
              {isSelected(cat.allergenId)
                ? variant === 'danger' ? 'bg-danger text-white border-danger' : 'bg-primary text-white border-primary'
                : 'bg-surface text-text border-surface-dark'}"
            onclick={() => toggleAllForCategory(cat.allergenId)}
          >
            {actionStrings.all}
          </button>
          {#each cat.subItems as sub}
            {@const subSel = isSelected(sub.subitemId) || isSelected(cat.allergenId)}
            <button
              type="button"
              data-state={subSel ? (variant === 'danger' ? 'danger' : 'info') : undefined}
              class="py-1.5 px-3 rounded-xl text-sm transition-all border
                {subSel ? '' : 'bg-surface text-text border-surface-dark hover:border-primary/30'}"
              onclick={() => toggleSubItem(cat.allergenId, sub.subitemId)}
            >
              {subitemStrings[sub.subitemId as keyof typeof subitemStrings]}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  {/if}

  <!-- Custom allergen entry — always visible, no toggle -->
  <div class="rounded-xl border border-dashed border-surface-dark bg-white p-3 space-y-2">
    <p class="text-xs font-medium text-text-muted">{commonStrings.categoryGrid.customAllergenHeading}</p>

    {#if customItems.length > 0}
      <div class="flex flex-wrap gap-1.5">
        {#each customItems as slug}
          {@const name = customName(slug)}
          {@const icon = customIcon(name)}
          <span class="inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 font-medium
            {variant === 'danger' ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}">
            <span class="text-sm leading-none">{icon}</span>
            {name}
            <button
              type="button"
              class="opacity-60 hover:opacity-100 ml-0.5"
              onclick={() => removeCustom(slug)}
              aria-label={commonStrings.categoryGrid.removeAriaLabel}
            >×</button>
          </span>
        {/each}
      </div>
    {/if}

    <div class="flex gap-2">
      <input
        type="text"
        bind:value={customInput}
        placeholder={commonStrings.categoryGrid.customPlaceholder}
        class="input-base flex-1 px-3 py-2 bg-surface"
        onkeydown={(e) => e.key === 'Enter' && addCustom()}
      />
      <button
        type="button"
        class="px-4 py-2 rounded-xl text-sm font-medium shrink-0 transition-opacity
          {customInput.trim()
            ? (variant === 'danger' ? 'bg-danger text-white' : 'bg-primary text-white')
            : 'bg-surface-dark text-text-muted opacity-50 cursor-not-allowed'}"
        onclick={addCustom}
        disabled={!customInput.trim()}
      >
        {actionStrings.add}
      </button>
    </div>
  </div>
</div>
