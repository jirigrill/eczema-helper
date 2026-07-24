<script lang="ts">
  // PROTOTYPE — shared per-actor body for #557's variants: conflict pills
  // plus the item list as plain wrapping text (no chips/pills on foods —
  // dropped after human review). Wraps onto as many lines as needed;
  // nothing is ever truncated or cut off, regardless of item count or name
  // length.
  import { categoryStrings } from '$lib/strings/categories';
  import type { ActorState } from './mock-data';

  let { state }: { state: ActorState } = $props();
</script>

{#if state.status === 'empty'}
  <div class="text-primary text-[11px]">+ Zapsat</div>
{:else if state.status === 'logged'}
  {@const r = state.render}
  {#if r.conflictAllergens.length > 0}
    <div class="mb-1 flex flex-wrap gap-1">
      {#each r.conflictAllergens as a}
        <span class="bg-danger/15 text-danger rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
          >⚠ {categoryStrings[a as keyof typeof categoryStrings]?.name ?? a}</span
        >
      {/each}
    </div>
  {/if}
  <div class="text-text-muted text-[11px] leading-relaxed">
    {#each r.items as item, i}
      {#if i > 0}<span> · </span>{/if}<span class={item.conflict ? 'text-danger font-medium' : ''}
        >{item.name}</span
      >
    {/each}
  </div>
{/if}
