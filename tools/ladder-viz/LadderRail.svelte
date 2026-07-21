<!-- The whole ladder, always visible; the current run's position highlighted
     (the ladder never re-flows, only the highlight moves as you scrub). Compact —
     stacks above the inputs. In manual mode, this IS the dose picker (`manual`
     prop) — clicking a rung sets/clears that day's dose, so the ladder position
     and the day's logged dose are a single control instead of two echoes of the
     same value. -->
<script lang="ts">
  import type { LadderStep } from '$lib/domain/canonical-allergen';
  import type { PortionKind } from '$lib/domain/models';

  import type { DayView } from './adapter';

  let {
    day,
    manual,
  }: {
    day: DayView;
    manual?: {
      rungs: readonly LadderStep[];
      current: PortionKind | 'none' | undefined;
      onToggle: (anchor: PortionKind) => void;
    };
  } = $props();

  function anchorFor(id: string): PortionKind | undefined {
    return manual?.rungs.find((s) => s.id === id)?.anchor;
  }
</script>

<div class="rail">
  <div class="hd">
    <span class="title">{day.allergenLabel} ladder</span>
    <span class="mode">{day.explain.snapshot.mode}</span>
  </div>
  <div class="rungs">
    {#each [...day.rungs].reverse() as r (r.id)}
      {@const anchor = anchorFor(r.id)}
      <button
        type="button"
        class="rung state-{r.state}"
        class:clickable={!!manual}
        class:sel={manual && anchor !== undefined && anchor === manual.current}
        disabled={!manual || anchor === undefined}
        onclick={() => manual && anchor !== undefined && manual.onToggle(anchor)}
      >
        <span class="mark">
          {#if r.state === 'passed'}✓{:else if r.state === 'current'}▶{:else}·{/if}
        </span>
        <span class="dose">{r.dose}</span>
        {#if r.checkpoint}<span class="chk">checkpoint</span>{/if}
      </button>
    {/each}
    <div class="rung state-{day.rungs.some((r) => r.state !== 'ahead') ? 'passed' : 'ahead'}">
      <span class="mark">·</span><span class="dose start">start</span>
    </div>
  </div>
</div>

<style>
  .rail { padding: 12px; border-bottom: 1px solid var(--hair); }
  .hd { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
  .title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
  .mode { font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; }
  .rungs { display: flex; flex-direction: column; gap: 4px; }
  .rung {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid var(--hair);
    border-radius: 8px;
    font-size: 13px;
    background: var(--surface);
    width: 100%;
    text-align: left;
    font-family: inherit;
    color: inherit;
    cursor: default;
  }
  .rung.clickable:not(:disabled) { cursor: pointer; }
  .rung.clickable:not(:disabled):hover { border-color: var(--ink); }
  .rung.sel { border-color: var(--ink); background: color-mix(in srgb, var(--ink) 8%, var(--surface)); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ink) 18%, transparent); }
  .mark { width: 14px; text-align: center; color: var(--muted); }
  .dose { font-weight: 600; }
  .dose.start { color: var(--muted); font-weight: 400; }
  .chk { margin-left: auto; font-size: 9px; text-transform: uppercase; color: var(--hold); border: 1px solid var(--hold); border-radius: 999px; padding: 1px 6px; }
  .state-passed { color: var(--muted); }
  .state-passed .mark { color: var(--go); }
  .state-current { border-color: var(--go); background: color-mix(in srgb, var(--go) 10%, var(--surface)); box-shadow: 0 0 0 2px color-mix(in srgb, var(--go) 22%, transparent); }
  .state-current .mark { color: var(--go); }
  .state-current.sel { border-color: var(--ink); }
  .state-ahead { opacity: 0.5; }
</style>
