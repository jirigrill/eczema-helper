<script lang="ts">
  // PROTOTYPE — shared per-actor body for #557: the item list as plain
  // wrapping text (no chips/pills on foods). Wraps onto as many lines as
  // needed; nothing is ever truncated. An empty actor slot renders a single
  // "+" (decided empty-state treatment). Conflict allergens are NOT rendered
  // here — they're shown once per meal section, deduplicated across actors,
  // by the caller (see VariantB.svelte).
  import type { ActorState } from './mock-data';

  let { state }: { state: ActorState } = $props();
</script>

{#if state.status === 'empty'}
  <div class="text-primary text-lg leading-none">+</div>
{:else if state.status === 'logged'}
  <div class="text-text-muted text-[11px] leading-relaxed">
    {#each state.render.items as item, i}
      {#if i > 0}<span> · </span>{/if}<span class={item.conflict ? 'text-danger font-medium' : ''}
        >{item.name}</span
      >
    {/each}
  </div>
{/if}
