<!-- PROTOTYPE — throwaway (ticket #522). Two variants of the journey +
     drill-in interaction, switchable via ?variant=. Not part of the app. -->
<script lang="ts">
  import VariantSvelteFlow from './VariantSvelteFlow.svelte';
  import VariantMermaid from './VariantMermaid.svelte';

  const params = new URLSearchParams(window.location.search);
  let variant = $state<'svelte-flow' | 'mermaid'>(
    params.get('variant') === 'mermaid' ? 'mermaid' : 'svelte-flow',
  );

  function setVariant(v: 'svelte-flow' | 'mermaid') {
    variant = v;
    const url = new URL(window.location.href);
    url.searchParams.set('variant', v);
    window.history.replaceState({}, '', url);
  }
</script>

<div class="bar">
  <button class:active={variant === 'svelte-flow'} onclick={() => setVariant('svelte-flow')}>
    A — Svelte Flow
  </button>
  <button class:active={variant === 'mermaid'} onclick={() => setVariant('mermaid')}>
    B — Mermaid
  </button>
</div>

{#if variant === 'svelte-flow'}
  <VariantSvelteFlow />
{:else}
  <VariantMermaid />
{/if}

<style>
  .bar {
    position: fixed;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    display: flex;
    gap: 0.5rem;
    background: white;
    padding: 0.4rem;
    border-radius: 999px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  }
  .bar button {
    border: none;
    background: transparent;
    padding: 0.4rem 0.9rem;
    border-radius: 999px;
    cursor: pointer;
    font-family: system-ui, sans-serif;
    font-size: 0.85rem;
  }
  .bar button.active {
    background: #2563eb;
    color: white;
  }
</style>
