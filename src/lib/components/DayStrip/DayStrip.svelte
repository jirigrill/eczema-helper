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

  // Centre the selected cell horizontally inside the scroller.
  function scrollDateIntoView(date: string | undefined): void {
    if (!scrollerEl || !date) return;
    const cellEl = scrollerEl.querySelector<HTMLButtonElement>(
      `[data-testid="day-strip-cell"][data-date="${date}"]`,
    );
    if (!cellEl) return;
    // Measure with bounding rects, not `offsetLeft`: `offsetLeft` is relative to
    // the nearest positioned ancestor (offsetParent), which on desktop includes
    // the `max-w-lg mx-auto` column's left margin and overshoots the scroll. The
    // rect delta is layout-position independent.
    const scRect = scrollerEl.getBoundingClientRect();
    const cellRect = cellEl.getBoundingClientRect();
    const delta =
      cellRect.left - scRect.left - (scrollerEl.clientWidth / 2 - cellRect.width / 2);
    scrollerEl.scrollLeft += delta;
  }

  // Wait for Svelte to flush DOM updates AND for the browser to do layout
  // before measuring `offsetLeft`. `tick()` alone returns after Svelte's
  // microtask but before the next paint — on cold mount the scroller's
  // children may still report offsetLeft=0, so we'd scroll to 0 and the
  // selected day would land at the far left.
  function scheduleCenter(date: string | undefined): void {
    void tick().then(() => {
      requestAnimationFrame(() => scrollDateIntoView(date));
    });
  }

  // Re-anchor whenever the selection or cell list changes. Using $effect (vs
  // onMount) covers two cases the bottom-nav "Dnes" tab depends on:
  //   1. /day/[date] component is reused on param change → onMount never re-runs.
  //   2. The Dnes nav is clicked while already on today → no param change at
  //      all, so we expose recentre() for the layout to call directly.
  $effect(() => {
    void selectedDate;
    void cells;
    scheduleCenter(selectedDate ?? today);
  });

  // Public hook: lets the parent imperatively recentre the strip when the
  // route param doesn't change but the user expects a "jump back to today"
  // gesture (bottom-nav Dnes tab while already on /day/today).
  export function recentre(): void {
    scheduleCenter(selectedDate ?? today);
  }
</script>

<!-- sync with: src/lib/components/DayStrip/DayStrip.svelte -->
<div class="px-4 pb-3" data-testid="day-strip">
  <div class="day-strip-mask">
    <div
      bind:this={scrollerEl}
      class="day-strip-scroller flex gap-1 overflow-x-auto scroll-smooth snap-x"
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
          class="shrink-0 w-10 flex flex-col items-center gap-1 py-2 rounded-lg snap-center {baseClass}"
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
</div>

<style>
  /* Scrollbar visibility: desktop pointers (mouse) get a thin native bar so
   * the strip's horizontal scrollability is discoverable. Touch devices hide
   * it (no scrollbar UI exists there anyway and swipe is the obvious gesture).
   * `pointer: coarse` matches phones/tablets; `pointer: fine` (mouse/trackpad)
   * is the default and gets the visible bar. */
  .day-strip-scroller {
    scrollbar-width: thin;
    /* End padding = half the scroller minus half a cell (w-10 = 2.5rem). Lets
     * any cell — including today on a short, non-overflowing protocol — scroll
     * to dead-centre instead of clamping against the left edge. */
    padding-inline: calc(50% - 1.25rem);
  }
  @media (pointer: coarse) {
    .day-strip-scroller {
      scrollbar-width: none;
    }
    .day-strip-scroller::-webkit-scrollbar {
      display: none;
    }
  }

  /* The mask creates the "fade into the card-edge gutter" illusion: cells
   * scroll behind a soft alpha falloff at each end of the strip rather than
   * being abruptly clipped. The 12px ramp matches the visual gutter the
   * cards leave when they sit at px-4 inside max-w-lg. */
  .day-strip-mask {
    -webkit-mask-image: linear-gradient(
      to right,
      transparent 0,
      black 12px,
      black calc(100% - 12px),
      transparent 100%
    );
    mask-image: linear-gradient(
      to right,
      transparent 0,
      black 12px,
      black calc(100% - 12px),
      transparent 100%
    );
  }
</style>
