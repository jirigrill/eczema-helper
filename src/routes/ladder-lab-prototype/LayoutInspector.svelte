<script lang="ts">
  // LAYOUT 1 — INSPECTOR. A single focused card per day. The verdict is the
  // headline; the gate cascade sits directly under it (the fired gate is obvious
  // and everything above/below is right there — no scanning across the screen).
  // Ladder + inputs + engine state ride a compact right sidebar.
  import type { Step, RunResult } from './engine';
  import GateRow from './GateRow.svelte';
  import LadderStrip from './LadderStrip.svelte';
  import InputsCard from './InputsCard.svelte';
  import StatePanel from './StatePanel.svelte';
  import { verdictTone, verdictDetail } from './tokens';

  let { run, step }: { run: RunResult; step: Step } = $props();
  const firedIdx = $derived(step.trace.gates.findIndex((g) => !g.passed));
</script>

<div class="grid grid-cols-[1fr_240px] gap-4">
  <!-- focus column: verdict + gates -->
  <div class="space-y-3">
    <div class="flex items-center gap-3 rounded-lg border border-stone-700/50 bg-stone-900/60 p-3">
      <span class="text-[10px] uppercase tracking-widest text-stone-500">verdict</span>
      <span class="rounded-md px-3 py-1 text-lg font-bold {verdictTone[step.verdict.kind]}">{step.verdict.kind}</span>
      <span class="text-sm text-stone-400">{verdictDetail(step.verdict)}</span>
    </div>

    <div class="rounded-lg border border-stone-700/50 bg-stone-900/40 p-2">
      <div class="mb-1.5 px-1 text-[10px] uppercase tracking-widest text-stone-500">
        precedence cascade — stops at the gate that fired
      </div>
      <div class="space-y-1">
        {#each step.trace.gates as g, i}
          <GateRow gate={g} fired={i === firedIdx} dim={firedIdx !== -1 && i > firedIdx} />
        {/each}
      </div>
    </div>
  </div>

  <!-- compact sidebar -->
  <div class="space-y-3">
    <div class="rounded-lg border border-stone-700/50 bg-stone-900/40 p-2">
      <div class="mb-1 text-[10px] uppercase tracking-widest text-stone-500">ladder</div>
      <LadderStrip steps={run.ladder} state={step.trace.state} />
    </div>
    <div class="rounded-lg border border-stone-700/50 bg-stone-900/40 p-2">
      <div class="mb-1 text-[10px] uppercase tracking-widest text-stone-500">inputs @ {step.date.slice(5)}</div>
      <InputsCard events={step.events} />
    </div>
    <div class="rounded-lg border border-fuchsia-900/40 bg-fuchsia-950/20 p-2">
      <div class="mb-1 text-[10px] uppercase tracking-widest text-fuchsia-400/80">engine state</div>
      <StatePanel state={step.trace.state} showReplay={false} />
    </div>
  </div>
</div>
