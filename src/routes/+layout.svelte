<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';

  let { children } = $props();

  const tabs = [
    { href: '/calendar', label: 'Kalendář', icon: '📅' },
    { href: '/food', label: 'Jídlo', icon: '🥗' },
    { href: '/photos', label: 'Fotky', icon: '📷' },
    { href: '/trends', label: 'Trendy', icon: '📈' },
    { href: '/settings', label: 'Nastavení', icon: '⚙️' }
  ];
</script>

<main class="min-h-screen bg-surface" class:pb-16={$page.url.pathname !== '/login'}>
  {@render children()}
</main>

{#if $page.url.pathname !== '/login'}
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-dark flex z-50">
    {#each tabs as tab}
      <a
        href={tab.href}
        class="flex-1 flex flex-col items-center justify-center py-2 text-xs gap-0.5 transition-colors {$page.url.pathname.startsWith(tab.href) ? 'text-primary' : 'text-text-muted'}"
      >
        <span class="text-xl leading-none">{tab.icon}</span>
        <span>{tab.label}</span>
      </a>
    {/each}
  </nav>
{/if}
