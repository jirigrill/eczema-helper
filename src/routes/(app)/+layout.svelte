<script lang="ts">
  import { childrenStore } from '$lib/stores/children.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { page } from '$app/stores';
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

  // Map routes to page titles
  const pageTitles: Record<string, string> = {
    '/calendar': cs.calendar,
    '/food': cs.food,
    '/photos': cs.photos,
    '/trends': cs.trends,
    '/settings': cs.settings,
  };

  let pageTitle = $derived(pageTitles[$page.url.pathname] ?? cs.eczemaTracker);
</script>

<!-- Page title header -->
<header class="sticky top-0 z-40 bg-white border-b border-surface-dark px-4 py-3">
  <h1 class="text-lg font-semibold text-text">{pageTitle}</h1>
</header>

{@render children()}
