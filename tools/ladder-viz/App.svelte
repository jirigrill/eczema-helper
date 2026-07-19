<!-- PROTOTYPE — throwaway (ticket #522). Ladder-engine inspector, built to the
     six stated requirements:
       1. date strip on top → scrub the calendar forward/back
       2. clearly visible user inputs (meals / skin / reactions) — right rail
       3. engine as a state machine, each step showing inputs+outputs — center
       4. overall engine output — the verdict node + header pill
       5. whole ladder + current run — left rail
       6. smart screen use — one dense screen, three columns under the strip
     Everything is driven by the REAL engine (see engine.ts). -->
<script lang="ts">
  import { computeDay, DAYS } from './engine';
  import DateStrip from './DateStrip.svelte';
  import LadderRail from './LadderRail.svelte';
  import EnginePipeline from './EnginePipeline.svelte';
  import InputsPanel from './InputsPanel.svelte';

  let selected = $state(DAYS[4]!);
  const day = $derived(computeDay(selected));
</script>

<div class="app">
  <header class="topbar">
    <div class="brand">ladder-engine inspector <span class="proto">prototype</span></div>
    <div class="verdict-pill tone-{day.verdictTone}">{day.verdictLabel}</div>
  </header>

  <DateStrip bind:selected />

  <main class="grid">
    <aside class="col ladder"><LadderRail {day} /></aside>
    <section class="col engine">
      <div class="col-h">engine · 6-step precedence pipeline <span class="note">(trace reconstructed from public gates — #521 seam pending)</span></div>
      <div class="flow"><EnginePipeline {day} /></div>
    </section>
    <aside class="col inputs"><InputsPanel {day} /></aside>
  </main>
</div>

<style>
  .app { display: flex; flex-direction: column; height: 100vh; }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: var(--ink);
    color: white;
  }
  .brand { font-weight: 700; letter-spacing: 0.01em; }
  .proto { font-size: 10px; text-transform: uppercase; background: rgba(255, 255, 255, 0.16); padding: 2px 7px; border-radius: 999px; margin-left: 6px; vertical-align: middle; }
  .verdict-pill { font-weight: 700; padding: 5px 14px; border-radius: 999px; color: white; }
  .tone-go { background: var(--go); }
  .tone-hold { background: var(--hold); }
  .tone-stop { background: var(--stop); }

  .grid {
    flex: 1;
    display: grid;
    grid-template-columns: 260px 1fr 300px;
    min-height: 0;
  }
  .col { min-height: 0; background: var(--surface); }
  .col.ladder { border-right: 1px solid var(--hair); }
  .col.inputs { border-left: 1px solid var(--hair); }
  .col.engine { display: flex; flex-direction: column; background: var(--canvas); }
  .col-h {
    padding: 8px 14px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    border-bottom: 1px solid var(--hair);
    background: var(--surface);
  }
  .note { text-transform: none; letter-spacing: 0; font-size: 10px; opacity: 0.7; }
  .flow { flex: 1; min-height: 0; }
</style>
