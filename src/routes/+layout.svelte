<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';

  let { children } = $props();

  let pathname = $state('/');

  $effect(() => {
    return page.subscribe((p) => {
      pathname = p.url.pathname;
    });
  });

  const tabs = [
    { href: '/calendar', label: 'Kalendář', icon: '📅' },
    { href: '/food', label: 'Jídlo', icon: '🥗' },
    { href: '/photos', label: 'Fotky', icon: '📷' },
    { href: '/trends', label: 'Trendy', icon: '📈' },
    { href: '/settings', label: 'Nastavení', icon: '⚙️' }
  ];

  const showNav = $derived(pathname !== '/login');
</script>

<main class="min-h-screen bg-surface" class:pb-16={showNav}>
  {@render children()}
</main>

{#if showNav}
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-dark flex z-50">
    {#each tabs as tab}
      <a
        href={tab.href}
        class="flex-1 flex flex-col items-center justify-center py-2 text-xs gap-0.5 transition-colors {pathname.startsWith(tab.href) ? 'text-primary' : 'text-text-muted'}"
      >
        <span class="text-xl leading-none">{tab.icon}</span>
        <span>{tab.label}</span>
      </a>
    {/each}
  </nav>
{/if}
