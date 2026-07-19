<!-- PROTOTYPE — throwaway (ticket #522). Date scrubber — pure calendar
     navigation, nothing else. Move forward/back with the arrows or ←/→. -->
<script lang="ts">
  import { DAYS } from './engine';

  let { selected = $bindable() }: { selected: string } = $props();

  const idx = $derived(DAYS.indexOf(selected));

  function go(delta: number) {
    const next = Math.min(DAYS.length - 1, Math.max(0, idx + delta));
    selected = DAYS[next]!;
    document.getElementById(`day-${next}`)?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  }

  function weekday(iso: string) {
    // Czech single-letter weekday, UTC-anchored to avoid timezone drift.
    const wd = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];
    return wd[new Date(iso + 'T00:00:00Z').getUTCDay()]!;
  }
  function dayNum(iso: string) {
    return Number(iso.split('-')[2]);
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="strip">
  <button class="arrow" onclick={() => go(-1)} disabled={idx <= 0} aria-label="previous day">‹</button>
  <div class="days">
    {#each DAYS as d, i (d)}
      <button id="day-{i}" class="day" class:active={d === selected} onclick={() => (selected = d)}>
        <span class="wd">{weekday(d)}</span>
        <span class="num">{dayNum(d)}</span>
      </button>
    {/each}
  </div>
  <button class="arrow" onclick={() => go(1)} disabled={idx >= DAYS.length - 1} aria-label="next day">›</button>
</div>

<style>
  .strip {
    display: flex;
    align-items: stretch;
    gap: 6px;
    padding: 8px 12px;
    background: var(--surface);
    border-bottom: 1px solid var(--hair);
  }
  .arrow {
    border: 1px solid var(--hair);
    background: var(--surface-2);
    border-radius: 8px;
    width: 32px;
    font-size: 18px;
    cursor: pointer;
    color: var(--ink);
    flex: none;
  }
  .arrow:disabled { opacity: 0.35; cursor: default; }
  .days { display: flex; gap: 4px; overflow-x: auto; flex: 1; scrollbar-width: thin; }
  .day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    min-width: 42px;
    padding: 5px 4px;
    border: 1px solid var(--hair);
    border-radius: 8px;
    background: var(--surface);
    cursor: pointer;
    color: var(--muted);
    flex: none;
  }
  .day .wd { font-size: 10px; text-transform: uppercase; letter-spacing: 0.02em; }
  .day .num { font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--ink); }
  .day.active {
    border-color: var(--ink);
    background: var(--ink);
  }
  .day.active .wd, .day.active .num { color: white; }
</style>
