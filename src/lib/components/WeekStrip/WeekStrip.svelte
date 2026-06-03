<script lang="ts">
  import type { WeekStripCell } from './week-strip';

  type Props = {
    cells: WeekStripCell[];
    showDnesPill: boolean;
    today: string;
    onselectdate: (date: string) => void;
    canPageBack?: boolean;
    onpageback?: () => void;
  };

  const { cells, showDnesPill, today, onselectdate, canPageBack = false, onpageback }: Props = $props();

  function weekdayShort(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('cs-CZ', { weekday: 'short' });
  }
</script>

<!-- sync with: src/lib/components/WeekStrip/WeekStrip.svelte -->
<div class="px-3 pb-3" data-testid="week-strip">
  <div class="grid grid-cols-7 gap-1">
    {#each cells as cell, i (cell.date)}
      <button
        class="flex flex-col items-center gap-1 py-2 rounded-lg
          {cell.isSelected
            ? 'bg-primary text-white'
            : cell.isBeforeStart
              ? 'text-text-muted/40'
              : 'text-text-muted'}"
        onclick={() => (i === 0 && canPageBack && onpageback) ? onpageback() : onselectdate(cell.date)}
        data-testid="week-strip-cell"
        data-date={cell.date}
        aria-current={cell.isSelected ? 'date' : undefined}
        aria-disabled={cell.isBeforeStart ? 'true' : undefined}
      >
        <span class="text-[10px] uppercase {cell.isSelected ? 'opacity-80' : ''}">{weekdayShort(cell.date)}</span>
        <span class="text-sm font-semibold">{new Date(cell.date + 'T00:00:00').getDate()}</span>
        <span
          class="w-1.5 h-1.5 rounded-full
            {cell.isSelected ? 'bg-white/30 ring-1 ring-white' : 'bg-transparent'}"
        ></span>
      </button>
    {/each}
  </div>

  {#if showDnesPill}
    <div class="flex justify-center mt-2">
      <button
        class="text-[11px] font-semibold text-primary bg-primary/10 rounded-full px-3 py-1"
        onclick={() => onselectdate(today)}
        data-testid="dnes-pill"
      >
        Dnes
      </button>
    </div>
  {/if}
</div>
