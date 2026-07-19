<!-- PROTOTYPE — throwaway (ticket #522). Ladder-engine inspector.
     Two zones, condensed: a left "situation" column (ladder + the day's inputs,
     with a manual editor in manual mode) and the engine pipeline resolving to
     the verdict on the right. The date strip on top is pure calendar nav.
     Everything is driven by the REAL engine (see engine.ts). -->
<script lang="ts">
  import { computeDay, DAYS, SCENARIO, emptyEvents, type ScenarioEvents } from './engine';
  import DateStrip from './DateStrip.svelte';
  import LadderRail from './LadderRail.svelte';
  import EnginePipeline from './EnginePipeline.svelte';
  import InputsPanel from './InputsPanel.svelte';
  import ManualEditor from './ManualEditor.svelte';

  let mode = $state<'scenario' | 'manual'>('scenario');
  let manual = $state<ScenarioEvents>(emptyEvents());
  let selected = $state(DAYS[4]!);

  const events = $derived(mode === 'scenario' ? SCENARIO : manual);
  const day = $derived(computeDay(selected, events));
</script>

<div class="app">
  <header class="topbar">
    <div class="brand">ladder-engine inspector <span class="proto">prototype</span></div>

    <div class="mode-toggle">
      <button class:on={mode === 'scenario'} onclick={() => (mode = 'scenario')}>scenario</button>
      <button class:on={mode === 'manual'} onclick={() => (mode = 'manual')}>manual</button>
    </div>

    <div class="verdict">
      <span class="vlabel">verdict</span>
      <span class="verdict-pill tone-{day.verdictTone}">{day.verdictLabel}</span>
    </div>
  </header>

  <DateStrip bind:selected />

  <main class="grid">
    <aside class="col situation">
      {#if mode === 'manual'}
        <ManualEditor bind:events={manual} date={selected} />
      {/if}
      <LadderRail {day} />
      <InputsPanel {day} />
    </aside>

    <section class="col engine">
      <div class="col-h">
        engine · 6-step precedence pipeline
        <span class="note">trace reconstructed from public gates — #521 seam pending · click a node to unroll</span>
      </div>
      <div class="flow"><EnginePipeline {day} /></div>
    </section>
  </main>
</div>

<style>
  .app { display: flex; flex-direction: column; height: 100vh; }
  .topbar {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 9px 16px;
    background: var(--ink);
    color: white;
  }
  .brand { font-weight: 700; letter-spacing: 0.01em; }
  .proto { font-size: 10px; text-transform: uppercase; background: rgba(255, 255, 255, 0.16); padding: 2px 7px; border-radius: 999px; margin-left: 6px; vertical-align: middle; }

  .mode-toggle { display: flex; gap: 2px; background: rgba(255, 255, 255, 0.1); padding: 2px; border-radius: 8px; }
  .mode-toggle button {
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.6);
    font-size: 12px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 6px;
    cursor: pointer;
  }
  .mode-toggle button.on { background: var(--surface); color: var(--ink); }

  .verdict { margin-left: auto; display: flex; align-items: center; gap: 9px; }
  .vlabel { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.6; }
  .verdict-pill { font-weight: 700; padding: 5px 14px; border-radius: 999px; color: white; }
  .tone-go { background: var(--go); }
  .tone-hold { background: var(--hold); }
  .tone-stop { background: var(--stop); }

  .grid { flex: 1; display: grid; grid-template-columns: 320px 1fr; min-height: 0; }
  .col { min-height: 0; }
  .col.situation { border-right: 1px solid var(--hair); background: var(--surface); overflow-y: auto; display: flex; flex-direction: column; }
  .col.engine { display: flex; flex-direction: column; background: var(--canvas); }
  .col-h {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 8px 14px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    border-bottom: 1px solid var(--hair);
    background: var(--surface);
  }
  .note { text-transform: none; letter-spacing: 0; font-size: 10px; opacity: 0.75; }
  .flow { flex: 1; min-height: 0; }
</style>
