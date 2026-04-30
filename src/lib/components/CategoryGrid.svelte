<script lang="ts">
  import { CATEGORIES } from '$lib/data/categories';

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

  const regularCategories = CATEGORIES.filter(c => c.categoryId !== 'other');

  let customInput = $state('');
  let expandedCategory = $state<string | null>(null);

  const customItems = $derived(selected.filter(s => s.startsWith('other:')));

  // Whole: explicit whole-categoryId OR every sub-item individually ticked
  function isWholeSelected(categoryId: string): boolean {
    if (selected.includes(categoryId)) return true;
    const cat = CATEGORIES.find(c => c.categoryId === categoryId);
    if (!cat || cat.subItems.length === 0) return false;
    return cat.subItems.every(sub => selected.includes(sub.subitemId));
  }

  // Partial: some (but not all) sub-items selected, whole categoryId not selected
  function isPartiallySelected(categoryId: string): boolean {
    if (isWholeSelected(categoryId)) return false;
    return selected.some(s => s.startsWith(categoryId + ':'));
  }

  function isCategorySelected(categoryId: string) {
    return isWholeSelected(categoryId) || isPartiallySelected(categoryId);
  }

  function toggle(categoryId: string) {
    if (disabledSlugs.includes(categoryId)) return;
    if (!expandable) {
      if (selected.includes(categoryId)) {
        selected = selected.filter(s => s !== categoryId);
      } else {
        selected = [...selected, categoryId];
      }
      return;
    }
    const cat = CATEGORIES.find(c => c.categoryId === categoryId);
    if (cat && cat.subItems.length > 0) {
      expandedCategory = expandedCategory === categoryId ? null : categoryId;
    } else {
      if (selected.includes(categoryId)) {
        selected = selected.filter(s => s !== categoryId);
      } else {
        selected = [...selected, categoryId];
      }
    }
  }

  function toggleAllForCategory(categoryId: string) {
    const withoutSubs = selected.filter(s => !s.startsWith(categoryId + ':'));
    if (withoutSubs.includes(categoryId)) {
      selected = withoutSubs.filter(s => s !== categoryId);
    } else {
      selected = [...withoutSubs, categoryId];
    }
  }

  function toggleSubItem(categoryId: string, subitemId: string) {
    const withoutWhole = selected.filter(s => s !== categoryId);
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
      .map(n => `other:${n}`)
      .filter(slug => !selected.includes(slug));
    if (newSlugs.length > 0) selected = [...selected, ...newSlugs];
    customInput = '';
  }

  function selectedSubItemCount(categoryId: string): number {
    if (selected.includes(categoryId)) {
      const cat = CATEGORIES.find(c => c.categoryId === categoryId);
      return cat?.subItems.length ?? 1;
    }
    return selected.filter(s => s.startsWith(categoryId + ':')).length;
  }

  function removeCustom(slug: string) {
    selected = selected.filter(s => s !== slug);
  }

  function isSelected(id: string) {
    return selected.includes(id);
  }

  function isDisabled(categoryId: string) {
    return disabledSlugs.includes(categoryId);
  }

  // Shared dismiss button style (used for both Zavřít actions)
  const dismissCls = 'text-xs text-text-muted border border-surface-dark rounded-xl px-2.5 py-1 font-medium hover:text-text hover:border-text-muted transition-colors';
</script>

<div class="space-y-2">
  <div class="grid grid-cols-3 gap-2">
    {#each regularCategories as cat (cat.categoryId)}
      {@const whole = isWholeSelected(cat.categoryId)}
      {@const partial = isPartiallySelected(cat.categoryId)}
      {@const dis = isDisabled(cat.categoryId)}
      {@const isExpanded = expandable && expandedCategory === cat.categoryId}
      <button
        type="button"
        class="
          flex flex-col items-center gap-1 py-3 px-1 rounded-xl text-xs font-medium
          transition-all min-h-[72px] border
          {dis
            ? 'bg-surface border-surface-dark text-text-muted opacity-50 cursor-not-allowed'
            : isExpanded
              ? 'bg-primary/10 border-primary/40 text-primary'
              : whole && variant === 'primary'
                ? 'bg-primary border-primary text-white shadow-sm'
                : whole && variant === 'danger'
                  ? 'bg-danger border-danger text-white shadow-sm'
                  : partial && variant === 'primary'
                    ? 'bg-primary/12 border-primary/50 text-primary'
                    : partial && variant === 'danger'
                      ? 'bg-danger/12 border-danger/50 text-danger'
                      : 'bg-white border-surface-dark text-text hover:border-primary/40'}
        "
        onclick={() => toggle(cat.categoryId)}
        disabled={dis}
      >
        <span class="text-2xl leading-none">{cat.icon}</span>
        <span class="leading-tight text-center">{cat.nameCs}</span>
        {#if dis}
          <span class="text-[10px] opacity-70">vaše alergie</span>
        {:else if partial}
          <span class="text-[10px] font-semibold opacity-80">část</span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Sub-item expansion panel (expandable mode only) -->
  {#if expandable && expandedCategory}
    {@const cat = regularCategories.find(c => c.categoryId === expandedCategory)}
    {#if cat && cat.subItems.length > 0}
      <div class="rounded-xl border border-primary/30 bg-white p-3 space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-text">{cat.icon} {cat.nameCs}</p>
          <button
            type="button"
            class={dismissCls}
            onclick={() => (expandedCategory = null)}
          >
            {selectedSubItemCount(cat.categoryId) > 0 ? `Hotovo (${selectedSubItemCount(cat.categoryId)})` : 'Hotovo'}
          </button>
        </div>
        <!-- "Vše" chip -->
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="py-1.5 px-3 rounded-xl text-sm font-medium transition-all border
              {isSelected(cat.categoryId)
                ? variant === 'danger' ? 'bg-danger text-white border-danger' : 'bg-primary text-white border-primary'
                : 'bg-surface text-text border-surface-dark'}"
            onclick={() => toggleAllForCategory(cat.categoryId)}
          >
            Vše
          </button>
          {#each cat.subItems as sub}
            {@const subSel = isSelected(sub.subitemId) || isSelected(cat.categoryId)}
            <button
              type="button"
              class="py-1.5 px-3 rounded-xl text-sm transition-all border
                {subSel
                  ? variant === 'danger' ? 'bg-danger/15 text-danger border-danger/30' : 'bg-primary/15 text-primary border-primary/30'
                  : 'bg-surface text-text border-surface-dark hover:border-primary/30'}"
              onclick={() => toggleSubItem(cat.categoryId, sub.subitemId)}
            >
              {sub.nameCs}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  {/if}

  <!-- Custom allergen entry — always visible, no toggle -->
  <div class="rounded-xl border border-dashed border-surface-dark bg-white p-3 space-y-2">
    <p class="text-xs font-medium text-text-muted">Vlastní alergen</p>

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
              aria-label="Odebrat"
            >×</button>
          </span>
        {/each}
      </div>
    {/if}

    <div class="flex gap-2">
      <input
        type="text"
        bind:value={customInput}
        placeholder="Např. Cibule, Mrkev…"
        class="flex-1 rounded-xl border border-surface-dark px-3 py-2 text-sm text-text
          focus:outline-none focus:ring-2 focus:ring-primary/40 bg-surface"
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
        Přidat
      </button>
    </div>
  </div>
</div>
