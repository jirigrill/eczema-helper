<!-- PROTOTYPE — throwaway (ticket #522). Manual mode: log your own events on
     the selected day and watch the REAL engine react. One dose / one skin
     reading / one reaction verdict per day (clicking the active one clears it).
     Everything flows straight into `computeDay` — same code path as the
     canned scenario. -->
<script lang="ts">
  import {
    dose,
    skin,
    evaluation,
    STEPS,
    emptyEvents,
    type ScenarioEvents,
  } from './engine';
  import type { AllergenOutcome, RegionLevel } from '$lib/domain/models';

  let { events = $bindable(), date }: { events: ScenarioEvents; date: string } = $props();

  const curDose = $derived(events.meals.find((m) => m.date === date));
  const curDoseRungId = $derived(
    curDose ? STEPS.find((s) => s.anchor === curDose.items[0]!.amount)?.id : undefined,
  );
  const curSkin = $derived(events.observations.find((o) => o.date === date));
  const curSkinLevel = $derived((curSkin?.regions[0]?.level ?? (curSkin ? 0 : undefined)) as RegionLevel | undefined);
  const curEval = $derived(events.evaluations.find((e) => e.date === date));

  function setDose(rungId: string) {
    const rung = STEPS.find((s) => s.id === rungId)!;
    const meals = events.meals.filter((m) => m.date !== date);
    if (curDoseRungId !== rungId) meals.push(dose(date, rung));
    events = { ...events, meals };
  }
  function setSkin(level: RegionLevel) {
    const observations = events.observations.filter((o) => o.date !== date);
    if (curSkinLevel !== level) observations.push(skin(date, level));
    events = { ...events, observations };
  }
  function setEval(outcome: AllergenOutcome) {
    const evaluations = events.evaluations.filter((e) => e.date !== date);
    if (curEval?.outcome !== outcome) evaluations.push(evaluation(date, outcome));
    events = { ...events, evaluations };
  }
  function reset() {
    events = emptyEvents();
  }

  const OUTCOMES: { id: AllergenOutcome; label: string; tone: string }[] = [
    { id: 'tolerated', label: 'tolerated', tone: 'go' },
    { id: 'mild-reaction', label: 'mild', tone: 'hold' },
    { id: 'clear-reaction', label: 'clear', tone: 'hold' },
    { id: 'severe-reaction', label: 'severe', tone: 'stop' },
  ];
  const total = $derived(events.meals.length + events.observations.length + events.evaluations.length);
</script>

<div class="editor">
  <div class="hd">
    <span class="tag">manual</span>
    <span class="on">log on {date}</span>
    <button class="reset" onclick={reset} disabled={total === 0}>clear all</button>
  </div>

  <div class="group">
    <div class="glabel">dose (rung)</div>
    <div class="btns">
      {#each STEPS as s (s.id)}
        <button class="chip" class:sel={curDoseRungId === s.id} onclick={() => setDose(s.id)}>{s.dose}</button>
      {/each}
    </div>
  </div>

  <div class="group">
    <div class="glabel">skin severity</div>
    <div class="btns">
      {#each [0, 1, 2, 3] as lvl (lvl)}
        <button class="chip sev sev-{lvl}" class:sel={curSkinLevel === lvl} onclick={() => setSkin(lvl as RegionLevel)}>{lvl}</button>
      {/each}
    </div>
  </div>

  <div class="group">
    <div class="glabel">reaction verdict</div>
    <div class="btns">
      {#each OUTCOMES as o (o.id)}
        <button class="chip tone-{o.tone}" class:sel={curEval?.outcome === o.id} onclick={() => setEval(o.id)}>{o.label}</button>
      {/each}
    </div>
  </div>
</div>

<style>
  .editor {
    padding: 12px;
    border-bottom: 1px solid var(--hair);
    background: var(--surface-2);
  }
  .hd { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .tag {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 700;
    color: white;
    background: var(--ink);
    padding: 2px 7px;
    border-radius: 999px;
  }
  .on { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
  .reset {
    margin-left: auto;
    font-size: 11px;
    border: 1px solid var(--hair);
    background: var(--surface);
    border-radius: 6px;
    padding: 3px 8px;
    cursor: pointer;
    color: var(--muted);
  }
  .reset:disabled { opacity: 0.4; cursor: default; }
  .group { margin-bottom: 9px; }
  .glabel { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 5px; }
  .btns { display: flex; flex-wrap: wrap; gap: 5px; }
  .chip {
    font-size: 12px;
    border: 1px solid var(--hair);
    background: var(--surface);
    border-radius: 7px;
    padding: 5px 9px;
    cursor: pointer;
    color: var(--ink);
  }
  .chip.sel { border-color: var(--ink); background: var(--ink); color: white; font-weight: 600; }
  .chip.sev { font-variant-numeric: tabular-nums; font-weight: 600; }
  .chip.tone-go.sel { background: var(--go); border-color: var(--go); }
  .chip.tone-hold.sel { background: var(--hold); border-color: var(--hold); }
  .chip.tone-stop.sel { background: var(--stop); border-color: var(--stop); }
</style>
