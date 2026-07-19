<!-- PROTOTYPE — throwaway (ticket #522). The day's user inputs, clearly
     rendered: what the mother logged (dose / skin / reaction) on the selected
     date — the raw evidence the engine reasoned over — plus the derived
     snapshot the gates read. -->
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
    {#each day.inputs.meals as m, i (i)}
      <div class="card meal">
        <span class="ico">🍽</span>
        <div class="body">
          <div class="line1"><span class="what">dose</span><span class="dose-pill">{m.dose}</span></div>
          <div class="sub">{m.text} · {m.time}</div>
        </div>
      </div>
    {/each}
  {/if}

  {#if day.inputs.skin.length}
    {#each day.inputs.skin as s, i (i)}
      <div class="card">
        <span class="ico">🩹</span>
        <div class="body">
          <div class="line1"><span class="what">skin</span><span class="sev sev-{s.level}">{s.level}</span></div>
          <div class="sub">{s.text}</div>
        </div>
      </div>
    {/each}
  {/if}

  {#if day.inputs.evals.length}
    {#each day.inputs.evals as e, i (i)}
      <div class="card reaction">
        <span class="ico">⚑</span>
        <div class="body">
          <div class="line1"><span class="what">verdict</span><span class="react-pill">{OUTCOME_LABEL[e.outcome]}</span></div>
        </div>
      </div>
    {/each}
  {/if}

  <div class="snap">
    <div class="snap-h">derived state <span class="recon">reconstructed · #521 pending</span></div>
    <div class="row"><span class="k">live rung</span><span class="v">{day.snapshot.liveRung}</span></div>
    <div class="row"><span class="k">mode</span><span class="v">{day.snapshot.mode}</span></div>
    <div class="row"><span class="k">days since dose</span><span class="v">{day.snapshot.daysSinceDose}</span></div>
    <div class="row"><span class="k">skin trend</span><span class="v">{day.snapshot.skinTrend}</span></div>
  </div>
</div>

<style>
  .panel { padding: 12px; overflow-y: auto; font-size: 13px; }
  .title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 10px; }
  .none { color: var(--muted); font-style: italic; padding: 6px 0 12px; }
  .card {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 9px 11px;
    border: 1px solid var(--hair);
    border-radius: 10px;
    margin-bottom: 6px;
    background: var(--surface);
  }
  .card.meal { border-left: 3px solid var(--go); }
  .card.reaction { border-left: 3px solid var(--stop); }
  .ico { font-size: 15px; line-height: 1.3; flex: none; }
  .body { flex: 1; min-width: 0; }
  .line1 { display: flex; align-items: center; gap: 8px; }
  .what { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); font-weight: 600; }
  .dose-pill { font-weight: 700; font-size: 13px; }
  .sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .react-pill { font-weight: 700; color: var(--stop); }
  .sev { width: 22px; height: 22px; display: grid; place-items: center; border-radius: 6px; color: white; font-size: 12px; font-weight: 700; }
  .sev-0 { background: #9aa3af; }
  .sev-1 { background: #5a8b5a; }
  .sev-2 { background: #c9a227; }
  .sev-3 { background: #b84444; }

  .snap { margin-top: 12px; padding: 11px; border: 1px solid var(--hair); border-radius: 10px; background: var(--surface-2); }
  .snap-h { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 7px; display: flex; justify-content: space-between; align-items: baseline; gap: 6px; }
  .recon { text-transform: none; letter-spacing: 0; font-size: 10px; opacity: 0.7; }
  .row { display: flex; justify-content: space-between; line-height: 1.8; }
  .k { color: var(--muted); }
  .v { font-weight: 600; }
</style>
