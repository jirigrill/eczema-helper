<script lang="ts">
  import { childrenStore } from '$lib/stores/children.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { cs } from '$lib/i18n/cs';
  import type { LayoutData } from './$types';
  import type { Snippet } from 'svelte';

  let { children, data }: { children: Snippet; data: LayoutData } = $props();

  // Initialise stores from server-loaded data
  // Note: data.user comes from server load and has fewer fields than domain User model
  $effect(() => {
    if (data.user) {
      authStore.setUser({
        ...data.user,
        passwordHash: '', // Not sent from server for security
        createdAt: '',
        updatedAt: '',
      });
    } else {
      authStore.setUser(null);
    }
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
      {cs.eczemaTracker}
    {/if}
  </span>

  <button
    onclick={() => (showChildPicker = !showChildPicker)}
    class="flex items-center gap-1 text-sm text-primary font-medium py-1 px-2 rounded-lg hover:bg-surface transition-colors"
    aria-label={cs.selectChild}
  >
    {#if childrenStore.children.length > 0}
      <span>▾</span>
    {:else}
      <a href="/settings" class="text-primary">+ {cs.addChild}</a>
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
        {cs.manageChildren}
      </a>
    </div>
  </div>
{/if}

{@render children()}
