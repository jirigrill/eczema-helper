<script lang="ts">
  // PROTOTYPE — shared per-actor body for #557's variant B: the item list as
  // plain wrapping text (no chips/pills on foods). Wraps onto as many lines
  // as needed; nothing is ever truncated or cut off. Conflict allergens are
  // NOT rendered here — they're shown once per meal section, deduplicated
  // across actors, by the caller (see VariantB.svelte).
  import type { ActorState, EmptyStyle } from './mock-data';

  let { state, emptyStyle }: { state: ActorState; emptyStyle: EmptyStyle } = $props();
</script>

{#if state.status === 'empty'}
  {#if emptyStyle === 1}
    <div class="text-primary text-[11px]">+ Zapsat</div>
  {:else if emptyStyle === 2}
    <div class="text-text-muted text-[11px]">Nezapsáno</div>
  {:else if emptyStyle === 3}
    <span class="bg-primary/5 border-primary/30 text-primary rounded-full border border-dashed px-2.5 py-0.5 text-[11px]"
      >+ Přidat</span
    >
  {:else}
    <div class="text-primary text-lg leading-none">+</div>
  {/if}
{:else if state.status === 'logged'}
  <div class="text-text-muted text-[11px] leading-relaxed">
    {#each state.render.items as item, i}
      {#if i > 0}<span> · </span>{/if}<span class={item.conflict ? 'text-danger font-medium' : ''}
        >{item.name}</span
      >
    {/each}
  </div>
{/if}
