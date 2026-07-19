<!-- PROTOTYPE — throwaway (ticket #522). The whole ladder, always visible;
     the current run's position highlighted (XState-inspector style — the
     ladder never re-flows, only the highlight moves as you scrub). -->
<script lang="ts">
  import type { DayView } from './engine';

  let { day }: { day: DayView } = $props();
</script>

<div class="rail">
  <div class="title">peanut ladder — breastfed</div>
  <div class="rungs">
    {#each [...day.rungs].reverse() as r (r.id)}
      <div class="rung state-{r.state}">
        <span class="mark">
          {#if r.state === 'passed'}✓{:else if r.state === 'current'}▶{:else}·{/if}
        </span>
        <span class="dose">{r.dose}</span>
        {#if r.checkpoint}<span class="chk">checkpoint</span>{/if}
      </div>
    {/each}
    <div class="rung state-{day.rungs.some((r) => r.state !== 'ahead') ? 'passed' : 'ahead'}">
      <span class="mark">·</span><span class="dose start">start</span>
    </div>
  </div>
  <div class="foot">
    <div><span class="fk">live rung</span><span class="fv">{day.snapshot.liveRung}</span></div>
    <div><span class="fk">mode</span><span class="fv">{day.snapshot.mode}</span></div>
  </div>
</div>

<style>
  .rail {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 12px;
    box-sizing: border-box;
  }
  .title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    margin-bottom: 12px;
  }
  .rungs { display: flex; flex-direction: column; gap: 4px; flex: 1; }
  .rung {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 10px;
    border: 1px solid var(--hair);
    border-radius: 8px;
    font-size: 13px;
    background: var(--surface);
  }
  .mark { width: 14px; text-align: center; color: var(--muted); }
  .dose { font-weight: 600; }
  .dose.start { color: var(--muted); font-weight: 400; }
  .chk { margin-left: auto; font-size: 9px; text-transform: uppercase; color: var(--hold); border: 1px solid var(--hold); border-radius: 999px; padding: 1px 6px; }
  .state-passed { color: var(--muted); }
  .state-passed .mark { color: var(--go); }
  .state-current { border-color: var(--go); background: color-mix(in srgb, var(--go) 10%, var(--surface)); box-shadow: 0 0 0 2px color-mix(in srgb, var(--go) 22%, transparent); }
  .state-current .mark { color: var(--go); }
  .state-ahead { opacity: 0.5; }
  .foot {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid var(--hair);
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
  }
  .foot > div { display: flex; justify-content: space-between; }
  .fk { color: var(--muted); }
  .fv { font-weight: 600; }
</style>
