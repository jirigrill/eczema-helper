<script lang="ts">
  // LAYOUT 3 — TRACE LOG. A dense debugger view: every day is a log line
  // (date · inputs · verdict), and the CURRENT day is expanded inline to show
  // its gate cascade + engine state indented beneath it, like stepping frames in
  // a debugger. Compact, monospace, scan top-to-bottom.
  import type { Step, RunResult } from './engine';
  import GateRow from './GateRow.svelte';
  import LadderStrip from './LadderStrip.svelte';
  import StatePanel from './StatePanel.svelte';
  import { verdictTone, verdictDetail, inputTone, eventText } from './tokens';

  let {
    run,
    cursor = $bindable(),
  }: { run: RunResult; cursor: number } = $props();

  function inputSummary(s: Step): { k: 'meal' | 'skin' | 'eval'; text: string }[] {
    return s.events.map((e) => ({ k: e.kind, text: eventText(e) }));
  }
</script>

<div class="grid grid-cols-[1fr_200px] gap-4">
  <div class="rounded-lg border border-stone-700/50 bg-stone-900/40 p-1.5">
    {#each run.steps as s, i}
      {@const firedIdx = s.trace.gates.findIndex((g) => !g.passed)}
      {@const active = i === cursor}
      <button
        onclick={() => (cursor = i)}
        class="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs
          {active ? 'bg-stone-700/40' : 'hover:bg-stone-800/40'}
          {i <= cursor ? '' : 'opacity-45'}"
      >
        <span class="w-4 text-stone-600">{active ? '▾' : '▸'}</span>
        <span class="w-12 text-stone-500">{s.date.slice(5)}</span>
        <span class="flex flex-1 flex-wrap gap-1">
          {#each inputSummary(s) as inp}
            <span class="inline-flex items-center gap-1">
              <span class="h-1.5 w-1.5 rounded-full {inputTone[inp.k].dot}"></span>
              <span class="text-stone-300">{inp.text}</span>
            </span>
          {/each}
        </span>
        <span class="rounded px-1.5 py-0.5 text-[10px] font-semibold {verdictTone[s.verdict.kind]}">
          {s.verdict.kind}
        </span>
        <span class="w-24 truncate text-[10px] text-stone-500">{verdictDetail(s.verdict)}</span>
      </button>

      {#if active}
        <div class="my-1 ml-6 space-y-1 border-l border-stone-700/50 pl-3">
          {#each s.trace.gates as g, gi}
            <GateRow gate={g} fired={gi === firedIdx} dim={firedIdx !== -1 && gi > firedIdx} />
          {/each}
        </div>
      {/if}
    {/each}
  </div>

  <div class="space-y-3">
    <div class="rounded-lg border border-stone-700/50 bg-stone-900/40 p-2">
      <div class="mb-1 text-[10px] uppercase tracking-widest text-stone-500">ladder</div>
      <LadderStrip steps={run.ladder} state={run.steps[cursor]?.trace.state ?? null} />
    </div>
    <div class="rounded-lg border border-fuchsia-900/40 bg-fuchsia-950/20 p-2">
      <div class="mb-1 text-[10px] uppercase tracking-widest text-fuchsia-400/80">engine state</div>
      <StatePanel state={run.steps[cursor]?.trace.state ?? null} />
    </div>
  </div>
</div>
