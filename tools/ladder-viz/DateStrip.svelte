<!-- PROTOTYPE — throwaway (ticket #522). Date scrubber: move forward/back
     through the calendar; each day tinted by that day's verdict so the run's
     arc is legible at a glance. -->
<script lang="ts">
  import { computeDay, DAYS } from './engine';

  let { selected = $bindable() }: { selected: string } = $props();

  // Precompute each day's tone once so the strip shows the whole trajectory.
  const tones = DAYS.map((d) => computeDay(d).verdictTone);
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

  function fmt(iso: string) {
    const [, m, d] = iso.split('-');
    return `${Number(d)}. ${Number(m)}.`;
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="strip">
  <button class="arrow" onclick={() => go(-1)} disabled={idx <= 0} aria-label="previous day">‹</button>
  <div class="days">
    {#each DAYS as d, i (d)}
      <button
        id="day-{i}"
        class="day tone-{tones[i]}"
        class:active={d === selected}
        onclick={() => (selected = d)}
      >
        <span class="dot"></span>
        <span class="lbl">{fmt(d)}</span>
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
    padding: 8px 10px;
    background: var(--surface);
    border-bottom: 1px solid var(--hair);
  }
  .arrow {
    border: 1px solid var(--hair);
    background: var(--surface-2);
    border-radius: 8px;
    width: 34px;
    font-size: 18px;
    cursor: pointer;
    color: var(--ink);
  }
  .arrow:disabled { opacity: 0.35; cursor: default; }
  .days {
    display: flex;
    gap: 5px;
    overflow-x: auto;
    flex: 1;
    scrollbar-width: thin;
  }
  .day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 52px;
    padding: 6px 4px;
    border: 1px solid var(--hair);
    border-radius: 8px;
    background: var(--surface);
    cursor: pointer;
    font-size: 11px;
    color: var(--muted);
  }
  .day.active { border-color: var(--ink); color: var(--ink); font-weight: 700; box-shadow: 0 0 0 2px color-mix(in srgb, var(--ink) 12%, transparent); }
  .dot { width: 8px; height: 8px; border-radius: 999px; background: var(--hair); }
  .tone-go .dot { background: var(--go); }
  .tone-hold .dot { background: var(--hold); }
  .tone-stop .dot { background: var(--stop); }
</style>
