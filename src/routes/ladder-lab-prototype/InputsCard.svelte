<script lang="ts">
  // The inputs the mother contributed on THIS day — grouped by kind so a day
  // with several meals or several skin checks reads clearly (each event listed).
  import type { Step } from './engine';
  import { inputTone, eventText } from './tokens';

  let { events }: { events: Step['events'] } = $props();

  const groups = $derived(
    (['meal', 'skin', 'eval'] as const).map((k) => ({
      k,
      tone: inputTone[k],
      items: events.filter((e) => e.kind === k),
    })),
  );
</script>

<div class="space-y-1.5">
  {#each groups as g}
    {#if g.items.length > 0}
      <div class="rounded-md border border-stone-700/40 bg-stone-800/20 px-2 py-1.5">
        <div class="mb-0.5 flex items-center gap-1.5">
          <span class="h-1.5 w-1.5 rounded-full {g.tone.dot}"></span>
          <span class="text-[10px] uppercase tracking-wide {g.tone.text}">{g.tone.label}</span>
          <span class="text-[10px] text-stone-600">×{g.items.length}</span>
        </div>
        {#each g.items as e}
          <div class="flex items-baseline justify-between text-[11px]">
            <span class="text-stone-200">{eventText(e)}</span>
            {#if e.note}<span class="ml-2 truncate text-[10px] text-stone-500">{e.note}</span>{/if}
          </div>
        {/each}
      </div>
    {/if}
  {/each}
  {#if events.length === 0}
    <div class="rounded-md border border-dashed border-stone-800 px-2 py-1.5 text-[11px] text-stone-600">
      no inputs this day
    </div>
  {/if}
</div>
