<!-- Manual mode: log your own events on the selected day and watch the REAL
     engine react. One skin reading / one reaction verdict per day (clicking the
     active one clears it); the day's dose is picked directly on the Ladder Rail,
     not here, so the dose isn't echoed in two editors at once. Events flow into
     the shared `buildRun` (run-events.ts) — the SAME event stream scenario
     replay uses, so both modes drive the identical engine path and cannot drift. -->
<script lang="ts">
  import type { AllergenOutcome, RegionLevel } from '$lib/domain/models';

  import type { RunEvent } from './run-events';

  let { events = $bindable(), date }: { events: RunEvent[]; date: string } = $props();

  const curSkin = $derived(
    events.find((e): e is Extract<RunEvent, { skin: unknown }> => e.date === date && 'skin' in e)
      ?.skin,
  );
  const curEval = $derived(
    events.find((e): e is Extract<RunEvent, { eval: unknown }> => e.date === date && 'eval' in e)
      ?.eval,
  );

  /** Drop this date's event of one channel, then optionally re-add `next` (toggle). */
  function replace(matches: (e: RunEvent) => boolean, next: RunEvent | null) {
    const kept = events.filter((e) => !(e.date === date && matches(e)));
    events = next ? [...kept, next] : kept;
  }

  function setSkin(level: RegionLevel) {
    replace((e) => 'skin' in e, curSkin === level ? null : { date, skin: level });
  }
  function setEval(outcome: AllergenOutcome) {
    replace((e) => 'eval' in e, curEval === outcome ? null : { date, eval: outcome });
  }
  function clearDay() {
    events = events.filter((e) => e.date !== date);
  }

  const OUTCOMES: { id: AllergenOutcome; label: string; tone: string }[] = [
    { id: 'tolerated', label: 'tolerated', tone: 'go' },
    { id: 'mild-reaction', label: 'mild', tone: 'hold' },
    { id: 'clear-reaction', label: 'clear', tone: 'hold' },
    { id: 'severe-reaction', label: 'severe', tone: 'stop' },
  ];
  const dayCount = $derived(events.filter((e) => e.date === date).length);
</script>

<div class="editor">
  <div class="hd">
    <span class="tag">manual</span>
    <span class="on">log on {date}</span>
    <button class="reset" onclick={clearDay} disabled={dayCount === 0}>clear day</button>
  </div>

  <div class="group">
    <div class="glabel">skin severity</div>
    <div class="btns">
      {#each [0, 1, 2, 3] as lvl (lvl)}
        <button class="chip sev sev-{lvl}" class:sel={curSkin === lvl} onclick={() => setSkin(lvl as RegionLevel)}>{lvl}</button>
      {/each}
    </div>
  </div>

  <div class="group">
    <div class="glabel">reaction verdict</div>
    <div class="btns">
      {#each OUTCOMES as o (o.id)}
        <button class="chip tone-{o.tone}" class:sel={curEval === o.id} onclick={() => setEval(o.id)}>{o.label}</button>
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
