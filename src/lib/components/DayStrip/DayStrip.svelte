<script lang="ts">
  import { tick } from 'svelte';
  import type { DayStripCell } from './day-strip';
  import { formatWeekdayShortCs } from '$lib/utils/date';

  type Props = {
    cells: DayStripCell[];
    today: string;
    todayRecorded: boolean;
    onselectdate: (date: string) => void;
  };

  const { cells, today, todayRecorded, onselectdate }: Props = $props();

  let scrollerEl: HTMLDivElement | undefined = $state();

  // Track which date is currently selected so we can re-scroll on changes.
  // The cells array is recomputed whenever selectedDate changes, so reading
  // the selected cell here makes the effect react to selection updates.
  const selectedDate = $derived(cells.find((c) => c.isSelected)?.date);

  // Initial mount anchors the strip near `today`; subsequent selection changes
  // re-scroll so the selected cell is always visible. This covers the bottom
  // "Dnes" nav-tab case where the route param changes but the component is
  // not remounted, leaving the strip's scroll position stale.
  function scrollDateIntoView(date: string | undefined): void {
    if (!scrollerEl || !date) return;
    const cellEl = scrollerEl.querySelector<HTMLButtonElement>(
      `[data-testid="day-strip-cell"][data-date="${date}"]`,
    );
    if (!cellEl) return;
    const offsetLeft = cellEl.offsetLeft;
    // Align so the cell sits near the right edge with a small inset, matching
    // the original onMount anchor for `today`.
    const targetScrollLeft = Math.max(
      0,
      offsetLeft - scrollerEl.clientWidth + cellEl.clientWidth + 16,
    );
    scrollerEl.scrollLeft = targetScrollLeft;
  }

  $effect(() => {
    void selectedDate;
    void cells;
    // Wait for the DOM to reflect the new cells array before measuring.
    void tick().then(() => scrollDateIntoView(selectedDate ?? today));
  });
</script>

<!-- sync with: src/lib/components/DayStrip/DayStrip.svelte -->
<div class="px-3 pb-3" data-testid="day-strip">
  <div
    bind:this={scrollerEl}
    class="flex gap-1 overflow-x-auto scroll-smooth -mx-3 px-3 snap-x"
    style="scrollbar-width: none;"
    data-testid="day-strip-scroller"
  >
    {#each cells as cell (cell.date)}
      {@const baseClass = cell.isSelected
        ? 'bg-primary text-white'
        : cell.isBeforeStart
          ? 'text-text-muted/40'
          : cell.isFuture
            ? 'text-text-muted/50'
            : 'text-text-muted'}
      <button
        class="shrink-0 w-10 flex flex-col items-center gap-1 py-2 rounded-lg snap-start {baseClass}"
        onclick={() => onselectdate(cell.date)}
        data-testid="day-strip-cell"
        data-date={cell.date}
        data-today={cell.isToday ? 'true' : undefined}
        data-future={cell.isFuture ? 'true' : undefined}
        data-before-start={cell.isBeforeStart ? 'true' : undefined}
        aria-current={cell.isSelected ? 'date' : undefined}
      >
        <span class="text-[10px] uppercase {cell.isSelected ? 'opacity-80' : ''}">
          {formatWeekdayShortCs(cell.date)}
        </span>
        <span class="text-sm font-semibold">
          {new Date(cell.date + 'T00:00:00').getDate()}
        </span>
        {#if cell.isToday && !cell.isSelected}
          <span
            class="w-1.5 h-1.5 rounded-full ring-1 ring-primary {todayRecorded ? 'bg-primary' : 'bg-transparent'}"
            data-testid="day-strip-today-ring"
            data-recorded={todayRecorded ? 'true' : 'false'}
          ></span>
        {:else if cell.isToday && cell.isSelected}
          <span
            class="w-1.5 h-1.5 rounded-full ring-1 ring-white {todayRecorded ? 'bg-white' : 'bg-white/30'}"
            data-testid="day-strip-today-ring"
            data-recorded={todayRecorded ? 'true' : 'false'}
          ></span>
        {:else if cell.isSelected}
          <span class="w-1.5 h-1.5 rounded-full bg-white/30 ring-1 ring-white"></span>
        {:else}
          <span class="w-1.5 h-1.5 rounded-full bg-transparent"></span>
        {/if}
      </button>
    {/each}
  </div>
</div>
