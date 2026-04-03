<script lang="ts">
  import type { FoodSubItem, MealItem } from '$lib/domain/models';
  import { filterSubItemsBySearch, getMealItemDisplayName } from '$lib/domain/services/meal-logging.service';

  let {
    subItems,
    selectedItems = [],
    onAdd,
    onRemove,
  }: {
    subItems: FoodSubItem[];
    selectedItems?: MealItem[];
    onAdd: (item: Partial<MealItem>) => void;
    onRemove: (index: number) => void;
  } = $props();

  let query = $state('');
  let showDropdown = $state(false);

  const filtered = $derived(filterSubItemsBySearch(subItems, query));

  function handleSelectItem(subItem: FoodSubItem) {
    onAdd({
      subItemId: subItem.id,
      categoryId: subItem.categoryId,
    });
    query = '';
    showDropdown = false;
  }

  function handleCustomItem(e: KeyboardEvent) {
    if (e.key === 'Enter' && query.trim() && filtered.length === 0) {
      e.preventDefault();
      onAdd({
        customName: query.trim(),
      });
      query = '';
      showDropdown = false;
    }
  }

  function handleInputFocus() {
    if (query.length >= 2) {
      showDropdown = true;
    }
  }

  function handleInputBlur() {
    // Delay to allow click on dropdown item
    setTimeout(() => {
      showDropdown = false;
    }, 200);
  }
</script>

<div class="space-y-3">
  <!-- Search input -->
  <div class="relative">
    <input
      type="text"
      bind:value={query}
      oninput={() => (showDropdown = query.length >= 2)}
      onfocus={handleInputFocus}
      onblur={handleInputBlur}
      onkeydown={handleCustomItem}
      placeholder="Přidej položku…"
      class="
        w-full rounded-lg border border-surface-dark
        px-3 py-2 text-sm
        focus:outline-none focus:ring-2 focus:ring-primary/50
      "
    />

    <!-- Dropdown -->
    {#if showDropdown && query.length >= 2}
      <ul
        class="
          absolute z-20 mt-1 w-full
          bg-white border border-surface-dark rounded-lg shadow-lg
          max-h-48 overflow-y-auto
        "
      >
        {#if filtered.length > 0}
          {#each filtered as item (item.id)}
            <li>
              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm hover:bg-surface"
                onmousedown={() => handleSelectItem(item)}
              >
                {item.nameCs}
              </button>
            </li>
          {/each}
        {:else}
          <li class="px-3 py-2 text-sm text-text-muted">
            Stiskněte Enter pro přidání "{query}"
          </li>
        {/if}
      </ul>
    {/if}
  </div>

  <!-- Selected items as chips -->
  {#if selectedItems.length > 0}
    <div class="flex flex-wrap gap-2">
      {#each selectedItems as item, i (i)}
        <span
          class="
            inline-flex items-center gap-1
            bg-primary/10 text-primary
            rounded-full px-3 py-1 text-sm
          "
        >
          {getMealItemDisplayName(item, subItems)}
          <button
            type="button"
            class="hover:text-danger"
            onclick={() => onRemove(i)}
            aria-label="Odebrat"
          >
            ×
          </button>
        </span>
      {/each}
    </div>
  {/if}
</div>
