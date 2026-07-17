<script lang="ts">
  // LAYOUT 2 — SPLIT. Left rail holds the "world" (ladder above, this day's
  // inputs below) as one tall self-contained column; the right holds the
  // "reasoning" (verdict banner, gate cascade, engine state). Two zones, each
  // scannable on its own — you look left for context, right for the decision.
  import type { Step, RunResult } from './engine';
  import GateRow from './GateRow.svelte';
  import LadderStrip from './LadderStrip.svelte';
  import InputsCard from './InputsCard.svelte';
  import StatePanel from './StatePanel.svelte';
  import { verdictTone, verdictDetail } from './tokens';

  let { run, step }: { run: RunResult; step: Step } = $props();
  const firedIdx = $derived(step.trace.gates.findIndex((g) => !g.passed));
</script>

<div class="grid grid-cols-[260px_1fr] gap-4">
  <!-- left rail: world -->
  <div class="space-y-3">
    <div class="rounded-lg border border-stone-700/50 bg-stone-900/40 p-2">
      <div class="mb-1 text-[10px] uppercase tracking-widest text-stone-500">ladder</div>
      <LadderStrip steps={run.ladder} state={step.trace.state} />
    </div>
    <div class="rounded-lg border border-stone-700/50 bg-stone-900/40 p-2">
      <div class="mb-1 text-[10px] uppercase tracking-widest text-stone-500">inputs @ {step.date.slice(5)}</div>
      <InputsCard events={step.events} />
    </div>
  </div>

  <!-- right: reasoning -->
  <div class="space-y-3">
    <div class="flex items-center gap-3 rounded-lg border border-stone-700/50 bg-stone-900/60 p-3">
      <span class="text-[10px] uppercase tracking-widest text-stone-500">verdict</span>
      <span class="rounded-md px-3 py-1 text-lg font-bold {verdictTone[step.verdict.kind]}">{step.verdict.kind}</span>
      <span class="text-sm text-stone-400">{verdictDetail(step.verdict)}</span>
    </div>

    <div class="grid grid-cols-[1fr_220px] gap-3">
      <div class="rounded-lg border border-stone-700/50 bg-stone-900/40 p-2">
        <div class="mb-1.5 px-1 text-[10px] uppercase tracking-widest text-stone-500">precedence cascade</div>
        <div class="space-y-1">
          {#each step.trace.gates as g, i}
            <GateRow gate={g} fired={i === firedIdx} dim={firedIdx !== -1 && i > firedIdx} />
          {/each}
        </div>
      </div>
      <div class="rounded-lg border border-fuchsia-900/40 bg-fuchsia-950/20 p-2">
        <div class="mb-1 text-[10px] uppercase tracking-widest text-fuchsia-400/80">engine state</div>
        <StatePanel state={step.trace.state} />
      </div>
    </div>
  </div>
</div>
