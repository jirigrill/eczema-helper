<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';

  // Props for Svelte 5 render pattern
  let { children } = $props();

  const tabs = [
    { href: '/calendar', label: 'Kalendář', icon: '📅' },
    { href: '/food', label: 'Jídlo', icon: '🥗' },
    { href: '/photos', label: 'Fotky', icon: '📷' },
    { href: '/trends', label: 'Trendy', icon: '📈' },
    { href: '/settings', label: 'Nastavení', icon: '⚙️' }
  ];

  const showNav = $derived(
    page.url.pathname !== '/login' && page.url.pathname !== '/'
  );
</script>

<main class="min-h-screen bg-surface" class:pb-16={showNav}>
  {@render children()}
</main>

{#if showNav}
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-dark flex z-50">
    {#each tabs as tab}
      {@const isActive = page.url.pathname.startsWith(tab.href)}
      <a
        href={tab.href}
        class="flex-1 flex flex-col items-center justify-center py-2 text-xs gap-0.5 transition-colors"
        class:text-primary={isActive}
        class:text-text-muted={!isActive}
      >
        <span class="text-xl leading-none">{tab.icon}</span>
        <span>{tab.label}</span>
      </a>
    {/each}
  </nav>
{/if}
