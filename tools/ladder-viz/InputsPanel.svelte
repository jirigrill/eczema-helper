<!-- PROTOTYPE — throwaway (ticket #522). The day's user inputs, clearly
     visible: what the mother logged (dose / skin / reaction) on the selected
     date — the raw evidence the engine reasoned over. -->
<script lang="ts">
  import { OUTCOME_LABEL, type DayView } from './engine';

  let { day }: { day: DayView } = $props();

  const empty = $derived(
    day.inputs.meals.length === 0 && day.inputs.skin.length === 0 && day.inputs.evals.length === 0,
  );
</script>

<div class="panel">
  <div class="title">logged inputs · {day.date}</div>

  {#if empty}
    <div class="none">nothing logged this day</div>
  {/if}

  {#if day.inputs.meals.length}
    <section>
      <div class="sec-h">🍽 meals (doses)</div>
      {#each day.inputs.meals as m, i (i)}
        <div class="item"><span class="t">{m.time}</span><span class="txt">{m.text}</span></div>
      {/each}
    </section>
  {/if}

  {#if day.inputs.skin.length}
    <section>
      <div class="sec-h">🩹 skin</div>
      {#each day.inputs.skin as s, i (i)}
        <div class="item"><span class="sev sev-{s.level}">{s.level}</span><span class="txt">{s.text}</span></div>
      {/each}
    </section>
  {/if}

  {#if day.inputs.evals.length}
    <section>
      <div class="sec-h">⚑ reaction verdict</div>
      {#each day.inputs.evals as e, i (i)}
        <div class="item"><span class="txt reaction">{OUTCOME_LABEL[e.outcome]}</span></div>
      {/each}
    </section>
  {/if}

  <div class="snap">
    <div class="sec-h">derived (reconstructed)</div>
    <div class="row"><span class="k">live rung</span><span class="v">{day.snapshot.liveRung}</span></div>
    <div class="row"><span class="k">mode</span><span class="v">{day.snapshot.mode}</span></div>
    <div class="row"><span class="k">days since dose</span><span class="v">{day.snapshot.daysSinceDose}</span></div>
    <div class="row"><span class="k">skin trend</span><span class="v">{day.snapshot.skinTrend}</span></div>
  </div>
</div>

<style>
  .panel {
    height: 100%;
    padding: 12px;
    box-sizing: border-box;
    overflow-y: auto;
    font-size: 13px;
  }
  .title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 12px; }
  .none { color: var(--muted); font-style: italic; padding: 8px 0; }
  section { margin-bottom: 14px; }
  .sec-h { font-size: 11px; font-weight: 600; color: var(--muted); margin-bottom: 6px; }
  .item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 9px;
    border: 1px solid var(--hair);
    border-radius: 8px;
    margin-bottom: 4px;
    background: var(--surface);
  }
  .t { font-variant-numeric: tabular-nums; color: var(--muted); font-size: 12px; }
  .txt { font-weight: 500; }
  .reaction { color: var(--stop); font-weight: 600; }
  .sev { width: 20px; height: 20px; display: grid; place-items: center; border-radius: 6px; color: white; font-size: 11px; font-weight: 700; }
  .sev-0 { background: #9aa; }
  .sev-1 { background: #5a8b5a; }
  .sev-2 { background: #c9a227; }
  .sev-3 { background: #b84444; }
  .snap { margin-top: 6px; padding-top: 10px; border-top: 1px solid var(--hair); }
  .row { display: flex; justify-content: space-between; line-height: 1.7; }
  .k { color: var(--muted); }
  .v { font-weight: 600; }
</style>
