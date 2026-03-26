<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import { cs } from '$lib/i18n/cs';

  let { children } = $props();

  const pathname = $derived(page.url.pathname);

  const tabs = [
    { href: '/calendar', label: cs.calendar, icon: '📅' },
    { href: '/food', label: cs.food, icon: '🥗' },
    { href: '/photos', label: cs.photos, icon: '📷' },
    { href: '/trends', label: cs.trends, icon: '📈' },
    { href: '/settings', label: cs.settings, icon: '⚙️' }
  ];

  const showNav = $derived(pathname !== '/login' && pathname !== '/register');
</script>

<main class="min-h-screen bg-surface" class:pb-16={showNav}>
  {@render children()}
</main>

{#if showNav}
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-dark flex z-50">
    {#each tabs as tab}
      <a
        href={tab.href}
        class="flex-1 flex flex-col items-center justify-center py-2 text-xs gap-0.5 transition-colors {pathname.startsWith(tab.href) ? 'font-semibold' : 'text-text-muted'}"
        style="color: {pathname.startsWith(tab.href) ? 'var(--color-primary)' : ''}"
      >
        <span class="text-xl leading-none">{tab.icon}</span>
        <span>{tab.label}</span>
      </a>
    {/each}
  </nav>
{/if}
