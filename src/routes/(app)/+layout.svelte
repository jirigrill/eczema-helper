<script lang="ts">
  import { childrenStore } from '$lib/stores/children.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import type { LayoutData } from './$types';

  let { children, data } = $props<{ children: unknown; data: LayoutData }>();

  // Initialise stores from server-loaded data
  $effect(() => {
    authStore.setUser(data.user as Parameters<typeof authStore.setUser>[0]);
    authStore.setLoading(false);
    childrenStore.setChildren(data.children);
    if (!childrenStore.activeChildId && data.children.length > 0) {
      childrenStore.setActiveChildId(data.children[0].id);
    }
  });

  let showChildPicker = $state(false);

  function selectChild(id: string) {
    childrenStore.setActiveChildId(id);
    showChildPicker = false;
  }
</script>

<!-- Child selector header -->
<header class="sticky top-0 z-40 bg-white border-b border-surface-dark px-4 py-2 flex items-center justify-between">
  <span class="text-base font-semibold text-text">
    {#if childrenStore.activeChild}
      {childrenStore.activeChild.name}
    {:else}
      Ekzém tracker
    {/if}
  </span>

  <button
    onclick={() => (showChildPicker = !showChildPicker)}
    class="flex items-center gap-1 text-sm text-primary font-medium py-1 px-2 rounded-lg hover:bg-surface transition-colors"
    aria-label="Vybrat dítě"
  >
    {#if childrenStore.children.length > 0}
      <span>▾</span>
    {:else}
      <a href="/settings" class="text-primary">+ Přidat dítě</a>
    {/if}
  </button>
</header>

<!-- Child picker dropdown -->
{#if showChildPicker && childrenStore.children.length > 0}
  <div class="fixed inset-0 z-30" role="presentation" onclick={() => (showChildPicker = false)}></div>
  <div class="absolute top-14 right-4 z-40 bg-white rounded-xl shadow-lg border border-surface-dark min-w-40 overflow-hidden">
    {#each childrenStore.children as child}
      <button
        onclick={() => selectChild(child.id)}
        class="w-full text-left px-4 py-3 text-sm hover:bg-surface transition-colors {child.id === childrenStore.activeChildId ? 'font-semibold text-primary' : 'text-text'}"
      >
        {child.name}
      </button>
    {/each}
    <div class="border-t border-surface-dark">
      <a
        href="/settings"
        onclick={() => (showChildPicker = false)}
        class="block px-4 py-3 text-sm text-text-muted hover:bg-surface transition-colors"
      >
        Správa dětí…
      </a>
    </div>
  </div>
{/if}

{@render children()}
