<script lang="ts">
  import { ALLERGEN_CATALOG } from '$lib/data/allergen-catalog';
  import { getCategoryConfig } from '$lib/config/categories';
  import { actionStrings } from '$lib/strings/actions';
  import { commonStrings } from '$lib/strings/common';
  import { matchAllergen } from '$lib/domain/allergen-matcher';

  let {
    selected = $bindable<string[]>([]),
    disabledSlugs = [],
    variant = 'primary',
    expandable: _expandable = false,
  }: {
    selected?: string[];
    disabledSlugs?: string[];
    variant?: 'primary' | 'danger';
    expandable?: boolean;
  } = $props();

  let customInput = $state('');

  const customItems = $derived(selected.filter(s => s.startsWith('other:')));

  function isWholeSelected(allergenId: string): boolean {
    return selected.includes(allergenId);
  }

  function toggle(allergenId: string) {
    if (disabledSlugs.includes(allergenId)) return;
    if (selected.includes(allergenId)) {
      selected = selected.filter(s => s !== allergenId);
    } else {
      selected = [...selected, allergenId];
    }
  }

  const CUSTOM_ICONS = ['🌿', '🫚', '🧄', '🧅', '🫛', '🌾', '🍄', '🫙', '🧂', '🌶️', '🫑', '🥬', '🫘', '🥜', '🍯'];
  function customIcon(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % CUSTOM_ICONS.length;
    return CUSTOM_ICONS[hash];
  }

  function customName(slug: string): string {
    return slug.slice(6);
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

  function removeCustom(slug: string) {
    selected = selected.filter(s => s !== slug);
  }

  function isDisabled(allergenId: string) {
    return disabledSlugs.includes(allergenId);
  }
</script>

<div class="space-y-2">
  <div class="grid grid-cols-3 gap-2">
    {#each ALLERGEN_CATALOG as cat (cat.id)}
      {@const whole = isWholeSelected(cat.id)}
      {@const dis = isDisabled(cat.id)}
      {@const cfg = getCategoryConfig(cat.id)}
      <button
        type="button"
        class="
          flex flex-col items-center gap-1 py-3 px-1 rounded-xl text-xs font-medium
          transition-all min-h-[72px] border
          {dis
            ? 'bg-surface border-surface-dark text-text-muted opacity-50 cursor-not-allowed'
            : whole && variant === 'primary'
              ? 'bg-primary border-primary text-white shadow-sm'
              : whole && variant === 'danger'
                ? 'bg-danger border-danger text-white shadow-sm'
                : 'bg-white border-surface-dark text-text hover:border-primary/40'}
        "
        onclick={() => toggle(cat.id)}
        disabled={dis}
      >
        <span class="text-2xl leading-none">{cfg?.icon ?? cat.icon}</span>
        <span class="leading-tight text-center">{cfg?.name ?? cat.id}</span>
        {#if dis}
          <span class="text-[10px] opacity-70">{commonStrings.categoryGrid.yourAllergyLabel}</span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Custom allergen entry -->
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
