<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import { CalendarIcon, FoodIcon, CameraIcon, TrendsIcon, SettingsIcon } from '$lib/components/icons';

  let { children } = $props();

  const pathname = $derived(page.url.pathname);

  const tabs = [
    { href: '/calendar', icon: CalendarIcon },
    { href: '/food', icon: FoodIcon },
    { href: '/photos', icon: CameraIcon },
    { href: '/trends', icon: TrendsIcon },
    { href: '/settings', icon: SettingsIcon }
  ];

  const showNav = $derived(pathname !== '/login' && pathname !== '/register' && !pathname.startsWith('/prototype'));
</script>

<main class="min-h-screen bg-surface" style:padding-bottom={showNav ? 'calc(3.5rem + var(--safe-area-inset-bottom))' : '0'}>
  {@render children()}
</main>

{#if showNav}
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-dark flex z-50" style="padding-bottom: var(--safe-area-inset-bottom); padding-left: var(--safe-area-inset-left); padding-right: var(--safe-area-inset-right);">
    {#each tabs as tab}
      <a
        href={tab.href}
        class="flex-1 flex items-center justify-center py-3 transition-colors select-none"
        class:text-text-muted={!pathname.startsWith(tab.href)}
        style:color={pathname.startsWith(tab.href) ? 'var(--color-primary)' : ''}
        aria-current={pathname.startsWith(tab.href) ? 'page' : undefined}
      >
        <tab.icon class="w-6 h-6" />
      </a>
    {/each}
  </nav>
{/if}
